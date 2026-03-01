import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationIntegration,
  IntegrationType,
} from './entities/notification-integration.entity';
import { PromptMonitorJob } from '../monitoring/entities/prompt-monitor-job.entity';
import * as nodemailer from 'nodemailer';

export type AlertEvent = 'down' | 'recovery';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationIntegration)
    private readonly repo: Repository<NotificationIntegration>,
  ) {}

  /* ── CRUD ──────────────────────────────────────────────── */

  async getForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(
    userId: string,
    dto: {
      type: IntegrationType;
      name: string;
      webhookUrl?: string;
      chatId?: string;
      emailAddress?: string;
      alertOnDown?: boolean;
      alertOnRecovery?: boolean;
    },
  ) {
    const integration = this.repo.create({
      userId,
      type: dto.type,
      name: dto.name,
      webhookUrl: dto.webhookUrl ?? '',
      chatId: dto.chatId ?? '',
      emailAddress: dto.emailAddress ?? '',
      alertOnDown: dto.alertOnDown ?? true,
      alertOnRecovery: dto.alertOnRecovery ?? true,
      isEnabled: true,
    });
    return this.repo.save(integration);
  }

  async update(
    id: string,
    userId: string,
    dto: Partial<{
      name: string;
      webhookUrl: string;
      chatId: string;
      emailAddress: string;
      alertOnDown: boolean;
      alertOnRecovery: boolean;
      isEnabled: boolean;
    }>,
  ) {
    const integration = await this.findOwned(id, userId);
    Object.assign(integration, dto);
    return this.repo.save(integration);
  }

  async remove(id: string, userId: string) {
    const integration = await this.findOwned(id, userId);
    await this.repo.remove(integration);
    return { success: true };
  }

  private async findOwned(id: string, userId: string) {
    const integration = await this.repo.findOne({ where: { id, userId } });
    if (!integration) throw new Error('Integration not found');
    return integration;
  }

  /* ── DISPATCH ──────────────────────────────────────────── */

  async dispatch(
    job: PromptMonitorJob,
    event: AlertEvent,
    meta?: { errorType?: string; httpStatus?: number },
  ) {
    const all = await this.repo.find({ where: { userId: job.user?.id ?? (job as any).userId } });

    const relevant = all.filter((i) => {
      if (!i.isEnabled) return false;
      if (event === 'down' && !i.alertOnDown) return false;
      if (event === 'recovery' && !i.alertOnRecovery) return false;
      return true;
    });

    await Promise.allSettled(relevant.map((i) => this.send(i, job, event, meta)));
  }

  /* ── PER-CHANNEL SEND ──────────────────────────────────── */

  private async send(
    integration: NotificationIntegration,
    job: PromptMonitorJob,
    event: AlertEvent,
    meta?: { errorType?: string; httpStatus?: number },
  ) {
    const isDown = event === 'down';
    const emoji = isDown ? '🔴' : '🟢';
    const status = isDown ? 'DOWN' : 'RECOVERED';
    const prompt = job.prompt.slice(0, 80);
    const ts = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    // Build a human-readable error string — only present on 'down' events
    const provider = (job as any).provider ?? 'openai';
    const model = (job as any).model ?? '';
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    const providerLine = `${providerName}${model ? ` — ${model}` : ''}`;
    const alertTitle = `${emoji} ${providerLine} — Scheduler ${status}`;

    const errorDetail = meta?.errorType
      ? `${meta.httpStatus ? `HTTP ${meta.httpStatus} — ` : ''}${meta.errorType}`
      : meta?.httpStatus
        ? `HTTP ${meta.httpStatus}`
        : null;

    try {
      switch (integration.type) {
        case 'slack':
          await this.sendSlack(integration.webhookUrl!, alertTitle, prompt, ts, isDown, errorDetail, providerLine);
          break;
        case 'discord':
          await this.sendDiscord(integration.webhookUrl!, alertTitle, prompt, ts, isDown, errorDetail, providerLine);
          break;
        case 'teams':
          await this.sendTeams(integration.webhookUrl!, alertTitle, prompt, ts, isDown, errorDetail, providerLine);
          break;
        case 'telegram':
          await this.sendTelegram(integration.chatId!, alertTitle, prompt, ts, errorDetail, providerLine);
          break;
        case 'email':
          await this.sendEmail(integration.emailAddress!, alertTitle, prompt, ts, isDown, errorDetail, providerLine);
          break;
      }
      this.logger.log(`✅ ${integration.type} alert sent (${event}) for job ${job.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`❌ ${integration.type} alert failed for job ${job.id}: ${errorMessage}`);
    }
  }

  /* ── Slack ─────────────────────────────────────────────── */
  private async sendSlack(
    url: string,
    alertTitle: string,
    prompt: string,
    ts: string,
    isDown: boolean,
    errorDetail: string | null,
    providerLine: string,
  ) {
    const color = isDown ? '#ef4444' : '#22c55e';
    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: alertTitle } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Scheduler:* \`${prompt}\`` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Provider / Model:* ${providerLine}` } },
    ];

    if (errorDetail) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Error:* \`${errorDetail}\`` },
      });
    }

    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `_${ts}_` }] });

    await this.post(url, { attachments: [{ color, blocks }] });
  }

  /* ── Discord ───────────────────────────────────────────── */
  private async sendDiscord(
    url: string,
    alertTitle: string,
    prompt: string,
    ts: string,
    isDown: boolean,
    errorDetail: string | null,
    providerLine: string,
  ) {
    const description = errorDetail
      ? `\`\`\`${prompt}\`\`\`\n**Provider / Model:** ${providerLine}\n**Error:** \`${errorDetail}\``
      : `\`\`\`${prompt}\`\`\`\n**Provider / Model:** ${providerLine}`;

    await this.post(url, {
      embeds: [{
        title: alertTitle,
        description,
        color: isDown ? 0xef4444 : 0x22c55e,
        footer: { text: `LLM Monitor • ${ts}` },
      }],
    });
  }

  /* ── Microsoft Teams (Adaptive Card) ──────────────────── */
  private async sendTeams(
    url: string,
    alertTitle: string,
    prompt: string,
    ts: string,
    isDown: boolean,
    errorDetail: string | null,
    providerLine: string,
  ) {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: `**${alertTitle}**`,
        size: 'Medium',
        weight: 'Bolder',
        color: isDown ? 'Attention' : 'Good',
      },
      { type: 'TextBlock', text: prompt, wrap: true, color: 'Default' },
      { type: 'TextBlock', text: `Provider / Model: ${providerLine}`, wrap: true, color: 'Default', size: 'Small' },
    ];

    if (errorDetail) {
      body.push({
        type: 'TextBlock',
        text: `⚠️ Error: ${errorDetail}`,
        wrap: true,
        color: 'Attention',
        size: 'Small',
      });
    }

    body.push({ type: 'TextBlock', text: ts, isSubtle: true, size: 'Small' });

    await this.post(url, {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
        },
      }],
    });
  }

  /* ── Telegram ──────────────────────────────────────────── */
  private async sendTelegram(
    chatId: string,
    alertTitle: string,
    prompt: string,
    ts: string,
    errorDetail: string | null,
    providerLine: string,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

    const errorLine = errorDetail ? `\n⚠️ <b>Error:</b> <code>${errorDetail}</code>` : '';
    const text = `<b>${alertTitle}</b>\n\n<code>${prompt}</code>\n<b>Provider / Model:</b> ${providerLine}${errorLine}\n\n<i>${ts}</i>`;

    await this.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  }

  /* ── Email (nodemailer, auto-configures transporter) ───── */
  private async sendEmail(
    to: string,
    alertTitle: string,
    prompt: string,
    ts: string,
    isDown: boolean,
    errorDetail: string | null,
    providerLine: string,
  ) {
    const transporter = await this.getMailTransporter();
    const color = isDown ? '#ef4444' : '#22c55e';
    const subject = `[LLM Monitor] ${alertTitle}`;

    const errorBlock = errorDetail
      ? `
        <div style="margin-top:16px;padding:12px 16px;background:#2d1f1f;border-left:3px solid #ef4444;border-radius:6px">
          <p style="margin:0 0 4px;font-size:12px;color:#f87171;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Error Details</p>
          <code style="font-size:13px;color:#fca5a5">${errorDetail}</code>
        </div>`
      : '';

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f1117;color:#e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:${color};padding:20px 24px">
          <h2 style="margin:0;color:#fff;font-size:18px">${alertTitle}</h2>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 12px;font-size:14px;color:#94a3b8">Scheduler prompt</p>
          <pre style="background:#1e2433;border-radius:8px;padding:12px;font-size:13px;color:#e2e8f0;white-space:pre-wrap;word-break:break-word">${prompt}</pre>
          <div style="margin-top:12px;padding:10px 14px;background:#1e2433;border-radius:8px;font-size:13px;color:#94a3b8"><span style="color:#cbd5e1;font-weight:600">Provider / Model:</span> ${providerLine}</div>
          ${errorBlock}
          <p style="margin:16px 0 0;font-size:12px;color:#64748b">${ts}</p>
        </div>
        <div style="padding:12px 24px;background:#1e2433;font-size:11px;color:#475569">
          Sent by LLM Monitor — your AI scheduler monitor
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'LLM Monitor <noreply@LLM Monitor.io>',
      to,
      subject,
      html,
    });
  }

  /**
   * Returns a nodemailer transporter.
   * If SMTP_HOST is set, use it. Otherwise fall back to Ethereal (test account)
   * so you get a preview URL in the logs without any real SMTP config.
   */
  private async getMailTransporter() {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    // Dev fallback: Ethereal catch-all — logs a preview URL
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const origSend = t.sendMail.bind(t);
    t.sendMail = async (opts: any) => {
      const info = await origSend(opts);
      this.logger.log(`📧 Email preview: ${nodemailer.getTestMessageUrl(info)}`);
      return info;
    };
    return t;
  }

  /* ── Helpers ───────────────────────────────────────────── */
  private async post(url: string, body: object) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  /* ── Test ping ─────────────────────────────────────────── */
  async test(id: string, userId: string) {
    const integration = await this.findOwned(id, userId);
    const fakeJob = { id: 'test', prompt: '🧪 This is a test alert from LLM Monitor', user: { id: userId } } as any;
    await this.send(integration, fakeJob, 'down', { errorType: 'test_error', httpStatus: 500 });
    return { success: true };
  }
}