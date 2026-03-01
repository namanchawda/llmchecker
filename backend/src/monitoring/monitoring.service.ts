import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { PromptMonitorRun } from './entities/prompt-monitor-run.entity';
import { PromptMonitorStatus } from './entities/prompt-monitor-status.entity';
import { PromptMonitorIncident } from './entities/prompt-monitor-incident.entity';
import { CreateMonitorJobDto } from './dto/create-monitor-job.dto';
import * as crypto from 'crypto';

// MonitoringSchedulerService intentionally removed.
// The worker backend polls the DB every 10 seconds for job changes
// (new jobs, isActive changes, interval changes) and self-manages timers.
// The API only writes to the DB — no direct scheduler calls needed.

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-change-this';
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_BUFFER = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(PromptMonitorJob)
    private readonly jobRepo: Repository<PromptMonitorJob>,
    @InjectRepository(PromptMonitorRun)
    private readonly runRepo: Repository<PromptMonitorRun>,
    @InjectRepository(PromptMonitorStatus)
    private readonly statusRepo: Repository<PromptMonitorStatus>,
    @InjectRepository(PromptMonitorIncident)
    private readonly incidentRepo: Repository<PromptMonitorIncident>,
  ) {}

  async setJobActive(jobId: string, userId: string, isActive: boolean) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, user: { id: userId } },
      relations: ['user'],
    });

    if (!job) throw new NotFoundException('Job not found');

    job.isActive = isActive;
    await this.jobRepo.save(job);

    // Worker will detect the isActive change on its next DB poll (every 10s)
    return { success: true, isActive };
  }

  async toggleAlerts(jobId: string, userId: string, alertsEnabled: boolean) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, user: { id: userId } },
      relations: ['user'],
    });

    if (!job) throw new NotFoundException('Job not found');

    job.alertsEnabled = alertsEnabled;
    await this.jobRepo.save(job);

    return { success: true, alertsEnabled };
  }

  async updateJob(jobId: string, userId: string, dto: CreateMonitorJobDto) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, user: { id: userId } },
      relations: ['user'],
    });

    if (!job) throw new NotFoundException('Job not found');

    job.provider = dto.provider;
    job.model = dto.model;
    job.encryptedApiKey = this.encrypt(dto.apiKey);
    job.intervalSeconds = dto.intervalSeconds;
    job.prompt = dto.prompt;

    await this.jobRepo.save(job);

    // Worker will detect the updated intervalSeconds on its next DB poll
    return { success: true, job };
  }

  async createJob(user: any, dto: CreateMonitorJobDto) {
    const encryptedKey = this.encrypt(dto.apiKey);

    const job = this.jobRepo.create({
      user,
      provider: dto.provider,
      model: dto.model,
      encryptedApiKey: encryptedKey,
      intervalSeconds: dto.intervalSeconds,
      prompt: dto.prompt,
      isActive: true,
      alertsEnabled: true,
    });

    await this.jobRepo.save(job);

    // Worker will pick up the new job on its next DB poll
    return job;
  }

  async deleteJob(jobId: string, userId: string) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, user: { id: userId } },
    });

    if (!job) throw new NotFoundException('Job not found');

    await this.jobRepo.remove(job);

    // Worker will detect the missing job on its next DB poll and stop its timer
    return { success: true };
  }

  async findJobForUser(jobId: string, userId: string): Promise<PromptMonitorJob> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId, user: { id: userId } },
      relations: ['user'],
    });

    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async getJobsForUser(userId: string) {
    return this.jobRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getRunsForJob(jobId: string, userId: string) {
    const job = await this.findJobForUser(jobId, userId);
    return this.runRepo.find({
      where: { job: { id: job.id } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getLatestRun(jobId: string, userId: string) {
    const job = await this.findJobForUser(jobId, userId);
    return this.runRepo.findOne({
      where: { job: { id: job.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async getStatusForJob(jobId: string, userId: string) {
    const job = await this.findJobForUser(jobId, userId);
    return this.statusRepo.findOne({
      where: { job: { id: job.id } },
    });
  }

  async getIncidentTimeline(jobId: string, userId: string) {
    const job = await this.findJobForUser(jobId, userId);
    return this.incidentRepo.find({
      where: { job: { id: job.id } },
      order: { startedAt: 'DESC' },
    });
  }

  async getStatusesByApiKey(apiKey: string) {
    if (!apiKey) throw new ForbiddenException('API key required');

    const jobs = await this.jobRepo.find({
      where: { user: { apiKey } },
      relations: ['user'],
    });

    if (jobs.length === 0) throw new NotFoundException('No jobs found for this API key');

    const statuses = await Promise.all(
      jobs.map(async (job) => {
        const status = await this.statusRepo.findOne({
          where: { job: { id: job.id } },
        });
        return {
          jobId: job.id,
          prompt: job.prompt,
          isActive: job.isActive,
          status: !job.isActive
            ? 'paused'
            : status?.success
              ? 'operational'
              : 'down',
          errorType: status?.success ? null : (status?.errorType ?? null),
          lastChecked: status?.updatedAt || null,
          responseTime: status?.responseTimeMs || null,
        };
      }),
    );

    return statuses;
  }

  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length < 2) return encryptedText;
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encrypted = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY_BUFFER, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }
}