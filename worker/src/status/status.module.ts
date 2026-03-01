import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { StatusScheduler } from './status.scheduler';

import { Provider } from './entities/provider.entity';
import { StatusSnapshot } from './entities/status-snapshot.entity';
import { Incident } from './entities/incident.entity';
import { ProviderSeeder } from './provider.seeder';
import { CurrentStatusSnapshot } from './entities/current-status-snapshot.entity';
import { ProviderComponentStatus } from './entities/provider-component-status.entity';
import { ComponentStatusService } from './component-status/component-status.service';
import { ProviderRecentIncident } from './entities/provider-recent-incident.entity';
import { RecentIncidentService } from './recent-incident/recent-incident.service';
import { RecentIncidentController } from './recent-incident/recent-incident.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider, 
      StatusSnapshot, 
      CurrentStatusSnapshot, 
      Incident, 
      ProviderComponentStatus,
      ProviderRecentIncident,
    ]),
    ScheduleModule.forRoot(), // ✅ REQUIRED
  ],
  providers: [
    StatusService,
    StatusScheduler,
    ProviderSeeder,
    ProviderComponentStatus,
    ComponentStatusService,
    RecentIncidentService,
  ],
  controllers: [StatusController, RecentIncidentController],
  exports: [StatusService],
})
export class StatusModule {}
