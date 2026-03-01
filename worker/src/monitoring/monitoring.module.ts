import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { PromptMonitorJob } from './entities/prompt-monitor-job.entity';
import { PromptMonitorRun } from './entities/prompt-monitor-run.entity';
import { MonitoringRunnerService } from './monitoring-runner.service';
import { MonitoringSchedulerService } from '../monitoring/monitoring-schedular.service'
import { PromptMonitorStatus } from './entities/prompt-monitor-status.entity';
import { PromptMonitorIncident } from './entities/prompt-monitor-incident.entity';
import { User } from '../auth/entities/user.entity';
import { NotificationModule } from '../notifications/notification.module';

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
    MonitoringRunnerService,
    MonitoringSchedulerService,
  ],
})
export class MonitoringModule {
  constructor(
    private readonly scheduler: MonitoringSchedulerService,
  ) {}
}