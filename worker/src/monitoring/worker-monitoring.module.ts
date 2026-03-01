import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { PromptMonitorRun } from './entities/prompt-monitor-run.entity';
import { PromptMonitorStatus } from './entities/prompt-monitor-status.entity';
import { PromptMonitorIncident } from './entities/prompt-monitor-incident.entity';
import { User } from '../auth/entities/user.entity';
import { NotificationIntegration } from '../notifications/entities/notification-integration.entity';
import { MonitoringRunnerService } from './monitoring-runner.service';
import { MonitoringSchedulerService } from './monitoring-schedular.service';
import { NotificationService } from '../notifications/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromptMonitorJob,
      PromptMonitorRun,
      PromptMonitorStatus,
      PromptMonitorIncident,
      User,
      NotificationIntegration,
    ]),
  ],
  providers: [
    MonitoringRunnerService,
    MonitoringSchedulerService, // ← interval timers run here
    NotificationService,        // ← sends Slack/Discord/email alerts
  ],
  // No controllers
})
export class WorkerMonitoringModule {}