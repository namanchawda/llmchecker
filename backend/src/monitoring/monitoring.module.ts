import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringRunnerService } from './monitoring-runner.service';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { PromptMonitorRun } from './entities/prompt-monitor-run.entity';
import { PromptMonitorStatus } from './entities/prompt-monitor-status.entity';
import { User } from '@/auth/entities/user.entity';
import { PromptMonitorIncident } from './entities/prompt-monitor-incident.entity';
import { NotificationModule } from '@/notifications/notification.module';

// MonitoringSchedulerService removed — runs in worker backend
// MonitoringRunnerService stays — used by the "run once" API endpoint

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromptMonitorJob,
      PromptMonitorRun,
      PromptMonitorStatus,
      User,
      PromptMonitorIncident,
    ]),
    NotificationModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringRunnerService,  // needed by controller's run-once endpoint
  ],
})
export class MonitoringModule {}