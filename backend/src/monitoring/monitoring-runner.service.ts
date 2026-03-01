import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { PromptMonitorRun } from './entities/prompt-monitor-run.entity';
import { PromptMonitorStatus } from './entities/prompt-monitor-status.entity';
import { PromptMonitorIncident } from './entities/prompt-monitor-incident.entity';
import { NotificationService } from '../notifications/notification.service';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-this';
const ALGORITHM = 'aes-256-cbc';

// ✅ CRITICAL FIX: Hash the encryption key to ensure it's exactly 32 bytes
const ENCRYPTION_KEY_BUFFER = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

@Injectable()
export class MonitoringRunnerService {
  private readonly logger = new Logger(MonitoringRunnerService.name);

  constructor(
    @InjectRepository(PromptMonitorRun)
    private readonly runRepo: Repository<PromptMonitorRun>,
    @InjectRepository(PromptMonitorStatus)
    private readonly statusRepo: Repository<PromptMonitorStatus>,
    @InjectRepository(PromptMonitorIncident)
    private readonly incidentRepo: Repository<PromptMonitorIncident>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Decrypt the stored API key before sending to provider ────────────────
  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      
      if (parts.length < 2) {
        this.logger.warn('API key appears to be plain text (no IV separator) - using as-is');
        return encryptedText;
      }
      
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encrypted = Buffer.from(parts.join(':'), 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      const result = decrypted.toString();
      this.logger.debug(`Decrypted API key successfully (length: ${result.length})`);
      return result;
    } catch (error) {
      this.logger.error('Decryption failed - this usually means ENCRYPTION_KEY changed or data is corrupted', error);
      throw new Error('Failed to decrypt API key. Check your ENCRYPTION_KEY environment variable.');
    }
  }

  async runOnce(job: PromptMonitorJob): Promise<PromptMonitorRun> {
    const startedAt = Date.now();

    let success = false;
    let responseText: string | null = null;
    let errorType: string | null = null;
    let httpStatus: number | null = null;

    // ── 1. Call the correct LLM provider ─────────────────────────────────────
    try {
      const result = await this.callProvider(job);
      httpStatus = result.httpStatus;

      if (result.success) {
        responseText = result.responseText ?? null;
        success = true;
      } else {
        errorType = result.errorType ?? `http_${result.httpStatus}`;
      }
    } catch (err: any) {
      errorType = err?.name ?? 'unknown_error';
      this.logger.error(`Provider call failed for job ${job.id}:`, err);
    }

    const responseTimeMs = Date.now() - startedAt;

    // ── 2. Save run ───────────────────────────────────────────────────────────
    const run = this.runRepo.create({
      job,
      success,
      responseTimeMs,
      responseText: responseText ?? undefined,
      errorType: errorType ?? undefined,
      httpStatus: httpStatus ?? undefined,
    });
    await this.runRepo.save(run);

    // ── 3. Upsert status ──────────────────────────────────────────────────────
    let status = await this.statusRepo.findOne({ where: { jobId: job.id } });
    const previousSuccess = status ? status.success : true;

    if (!status) {
      status = this.statusRepo.create({ jobId: job.id });
    }

    status.success = success;
    status.httpStatus = httpStatus ?? undefined;
    status.responseTimeMs = responseTimeMs;
    status.errorType = errorType ?? undefined;
    await this.statusRepo.save(status);

    // ── 4. Incident management ────────────────────────────────────────────────

    // Scheduler just went DOWN
    if (!success && previousSuccess) {
      const incident = this.incidentRepo.create({
        jobId: job.id,
        startedAt: new Date(),
        startErrorType: errorType ?? undefined,
        startHttpStatus: httpStatus ?? undefined,
      });
      await this.incidentRepo.save(incident);
      this.logger.warn(`🔴 Incident opened for job ${job.id}`);

      // ✅ Only dispatch if alerts are enabled for this scheduler
      if (job.alertsEnabled !== false) {
        this.notificationService.dispatch(job, 'down', {
          errorType: errorType ?? undefined,
          httpStatus: httpStatus ?? undefined,
        }).catch((e) =>
          this.logger.error(`Notification dispatch failed: ${e.message}`),
        );
      } else {
        this.logger.debug(`Alerts disabled for job ${job.id} — skipping notification`);
      }
    }

    // Scheduler just RECOVERED
    if (success && !previousSuccess) {
      const openIncident = await this.incidentRepo.findOne({
        where: { jobId: job.id, resolvedAt: null as any },
        order: { startedAt: 'DESC' },
      });

      if (openIncident) {
        openIncident.resolvedAt = new Date();
        await this.incidentRepo.save(openIncident);
        this.logger.log(`🟢 Incident resolved for job ${job.id}`);
      }

      // ✅ Only dispatch if alerts are enabled for this scheduler
      if (job.alertsEnabled !== false) {
        this.notificationService.dispatch(job, 'recovery').catch((e) =>
          this.logger.error(`Notification dispatch failed: ${e.message}`),
        );
      } else {
        this.logger.debug(`Alerts disabled for job ${job.id} — skipping recovery notification`);
      }
    }

    return run;
  }

  // ── Provider router ───────────────────────────────────────────────────────
  private async callProvider(job: PromptMonitorJob): Promise<{
    success: boolean;
    httpStatus: number;
    responseText?: string;
    errorType?: string;
  }> {
    const apiKey = this.decrypt(job.encryptedApiKey);

    switch (job.provider) {
      case 'openai':    return this.callOpenAI(apiKey, job.model, job.prompt);
      case 'anthropic': return this.callAnthropic(apiKey, job.model, job.prompt);
      case 'gemini':    return this.callGemini(apiKey, job.model, job.prompt);
      case 'grok':      return this.callGrok(apiKey, job.model, job.prompt);
      default: throw new Error(`Unknown provider: ${job.provider}`);
    }
  }

  // ── OpenAI ────────────────────────────────────────────────────────────────
  private async callOpenAI(apiKey: string, model: string, prompt: string) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 256,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        this.logger.error(`OpenAI API error (${res.status}):`, json);
        return { 
          success: false, 
          httpStatus: res.status, 
          errorType: json?.error?.type ?? json?.error?.code ?? `http_${res.status}` 
        };
      }
      
      return { 
        success: true, 
        httpStatus: res.status, 
        responseText: json?.choices?.[0]?.message?.content ?? '' 
      };
    } catch (error) {
      this.logger.error('OpenAI fetch failed:', error);
      throw error;
    }
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────
  private async callAnthropic(apiKey: string, model: string, prompt: string) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        this.logger.error(`Anthropic API error (${res.status}):`, json);
        return { 
          success: false, 
          httpStatus: res.status, 
          errorType: json?.error?.type ?? `http_${res.status}` 
        };
      }
      
      return { 
        success: true, 
        httpStatus: res.status, 
        responseText: json?.content?.[0]?.text ?? '' 
      };
    } catch (error) {
      this.logger.error('Anthropic fetch failed:', error);
      throw error;
    }
  }

  // ── Gemini ────────────────────────────────────────────────────────────────
  private async callGemini(apiKey: string, model: string, prompt: string) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        this.logger.error(`Gemini API error (${res.status}):`, json);
        return { 
          success: false, 
          httpStatus: res.status, 
          errorType: json?.error?.status ?? `http_${res.status}` 
        };
      }
      
      return { 
        success: true, 
        httpStatus: res.status, 
        responseText: json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '' 
      };
    } catch (error) {
      this.logger.error('Gemini fetch failed:', error);
      throw error;
    }
  }

  // ── Grok (xAI) ────────────────────────────────────────────────────────────
  private async callGrok(apiKey: string, model: string, prompt: string) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 256,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        this.logger.error(`Grok API error (${res.status}):`, json);
        return { 
          success: false, 
          httpStatus: res.status, 
          errorType: json?.error?.type ?? `http_${res.status}` 
        };
      }
      
      return { 
        success: true, 
        httpStatus: res.status, 
        responseText: json?.choices?.[0]?.message?.content ?? '' 
      };
    } catch (error) {
      this.logger.error('Grok fetch failed:', error);
      throw error;
    }
  }
}