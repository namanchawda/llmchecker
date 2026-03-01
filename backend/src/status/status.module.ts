import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatusService } from './status.service';
import { StatusController } from './status.controller';

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

// StatusScheduler intentionally removed — runs in worker backend

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
    // ScheduleModule removed — not needed in API backend
  ],
  providers: [
    StatusService,
    ProviderSeeder,
    ProviderComponentStatus,
    ComponentStatusService,
    RecentIncidentService,
    // StatusScheduler removed
  ],
  controllers: [StatusController, RecentIncidentController],
  exports: [StatusService],
})
export class StatusModule {}