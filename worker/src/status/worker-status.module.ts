import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Provider } from './entities/provider.entity';
import { StatusSnapshot } from './entities/status-snapshot.entity';
import { CurrentStatusSnapshot } from './entities/current-status-snapshot.entity';
import { Incident } from './entities/incident.entity';
import { ProviderComponentStatus } from './entities/provider-component-status.entity';
import { ProviderRecentIncident } from './entities/provider-recent-incident.entity';
import { ProviderIncidentAlertState } from './entities/provider-incident-alert-state.entity';
import { ProviderAlertSubscription } from '../provider-alerts/provider-alert-subscription.entity';
import { NotificationIntegration } from '../notifications/entities/notification-integration.entity';

import { StatusService } from './status.service';
import { StatusScheduler } from './status.scheduler';
import { ComponentStatusService } from './component-status/component-status.service';
import { RecentIncidentService } from './recent-incident/recent-incident.service';
import { ProviderSeeder } from './provider.seeder';
import { ProviderIncidentAlertService } from '../provider-alerts/provider-incident-alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      StatusSnapshot,
      CurrentStatusSnapshot,
      Incident,
      ProviderComponentStatus,
      ProviderRecentIncident,
      ProviderIncidentAlertState,
      ProviderAlertSubscription,
      NotificationIntegration,
    ]),
  ],
  providers: [
    StatusService,
    StatusScheduler,
    ComponentStatusService,
    RecentIncidentService,
    ProviderSeeder,
    ProviderComponentStatus,
    ProviderIncidentAlertService,
  ],
})
export class WorkerStatusModule {}