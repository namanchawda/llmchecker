import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { MonitoringRunnerService } from './monitoring-runner.service';

@Injectable()
export class MonitoringSchedulerService implements OnModuleInit {
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(PromptMonitorJob)
    private readonly jobRepo: Repository<PromptMonitorJob>,
    private readonly runner: MonitoringRunnerService,
  ) {}

  async onModuleInit() {
    const jobs = await this.jobRepo.find({
      where: { isActive: true },
      relations: ['user'], // ✅ load user so notificationService.dispatch() can find userId
    });

    for (const job of jobs) {
      this.startJob(job);
    }
  }

  startJob(job: PromptMonitorJob) {
    console.log('🔥 Starting scheduler for job:', job.id);

    if (this.timers.has(job.id)) return;

    const timer = setInterval(async () => {
      console.log('🔥 Running job:', job.id);

      try {
        // ✅ Always re-fetch with user relation so dispatch has userId
        const latestJob = await this.jobRepo.findOne({
          where: { id: job.id },
          relations: ['user'],
        });

        if (!latestJob || !latestJob.isActive) return;

        await this.runner.runOnce(latestJob);
      } catch (err) {
        console.error('Job run failed', job.id, err);
      }
    }, job.intervalSeconds * 1000);

    this.timers.set(job.id, timer);
  }

  stopJob(jobId: string) {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }
  }
}