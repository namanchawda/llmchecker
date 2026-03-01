import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { MonitoringRunnerService } from './monitoring-runner.service';

// This scheduler owns all job timers.
// Instead of being called directly by the API, it polls the DB every 10 seconds
// to detect: new jobs, deleted jobs, isActive changes, intervalSeconds changes.
// The API just writes to the DB — this service reacts automatically.

@Injectable()
export class MonitoringSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringSchedulerService.name);

  // jobId → { timer, intervalSeconds } — tracks what's currently running
  private timers = new Map<string, { timer: NodeJS.Timeout; intervalSeconds: number }>();

  // Polls DB for job changes
  private syncTimer: NodeJS.Timeout;

  constructor(
    @InjectRepository(PromptMonitorJob)
    private readonly jobRepo: Repository<PromptMonitorJob>,
    private readonly runner: MonitoringRunnerService,
  ) {}

  async onModuleInit() {
    this.logger.log('MonitoringSchedulerService starting — loading active jobs from DB');
    await this.syncWithDb();

    // Poll DB every 10 seconds to detect changes made by the API
    this.syncTimer = setInterval(() => this.syncWithDb(), 10_000);
  }

  onModuleDestroy() {
    // Clean up all timers on shutdown
    clearInterval(this.syncTimer);
    for (const { timer } of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  // ── Core sync logic ────────────────────────────────────────────────────────

  private async syncWithDb() {
    try {
      const dbJobs = await this.jobRepo.find({
        where: { isActive: true },
        relations: ['user'],
      });

      const dbJobIds = new Set(dbJobs.map(j => j.id));

      // 1. Stop timers for jobs that were deleted or deactivated
      for (const [jobId] of this.timers) {
        if (!dbJobIds.has(jobId)) {
          this.stopJob(jobId);
          this.logger.log(`Stopped job ${jobId} (removed or deactivated)`);
        }
      }

      // 2. Start or restart jobs that are new or have a changed interval
      for (const job of dbJobs) {
        const existing = this.timers.get(job.id);

        if (!existing) {
          // New job — start it
          this.startJob(job);
          this.logger.log(`Started new job ${job.id} (interval: ${job.intervalSeconds}s)`);
        } else if (existing.intervalSeconds !== job.intervalSeconds) {
          // Interval changed — restart with new interval
          this.stopJob(job.id);
          this.startJob(job);
          this.logger.log(`Restarted job ${job.id} with new interval ${job.intervalSeconds}s`);
        }
      }
    } catch (err) {
      this.logger.error('DB sync failed', err);
    }
  }

  // ── Timer management ───────────────────────────────────────────────────────

  public startJob(job: PromptMonitorJob) {
    if (this.timers.has(job.id)) return;

    const timer = setInterval(async () => {
      try {
        const latestJob = await this.jobRepo.findOne({
          where: { id: job.id },
          relations: ['user'],
        });

        if (!latestJob || !latestJob.isActive) {
          this.stopJob(job.id);
          return;
        }

        await this.runner.runOnce(latestJob);
      } catch (err) {
        this.logger.error(`Job ${job.id} run failed`, err);
      }
    }, job.intervalSeconds * 1000);

    this.timers.set(job.id, { timer, intervalSeconds: job.intervalSeconds });
  }

  public stopJob(jobId: string) {
    const entry = this.timers.get(jobId);
    if (entry) {
      clearInterval(entry.timer);
      this.timers.delete(jobId);
    }
  }
}