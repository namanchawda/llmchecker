import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { StatusSnapshot } from './entities/status-snapshot.entity';
import { Incident } from './entities/incident.entity';
import { CurrentStatusSnapshot } from './entities/current-status-snapshot.entity';
import { ServiceStatus } from './fetchers/types';
import { ProviderRecentIncident } from './entities/provider-recent-incident.entity';
import { RecentIncidentService } from './recent-incident/recent-incident.service';

@Injectable()
export class StatusService {
  private latestStatuses: ServiceStatus[] = [];

  constructor(
    @InjectRepository(Provider)
    private providerRepo: Repository<Provider>,
    @InjectRepository(StatusSnapshot)
    private snapshotRepo: Repository<StatusSnapshot>,
    @InjectRepository(Incident)
    private incidentRepo: Repository<Incident>,
    @InjectRepository(CurrentStatusSnapshot)
    private readonly currentSnapshotRepo: Repository<CurrentStatusSnapshot>,
    private readonly recentIncidentService: RecentIncidentService,
    // @InjectRepository(ProviderRecentIncident)
    // private readonly recentIncidentRepo: Repository<ProviderRecentIncident>,
  ) {}

  async replaceCurrentIncidents(
    snapshot: CurrentStatusSnapshot,
    provider: Provider,
    incidents: ServiceStatus['incidents'],
  ) {
    // 1️⃣ DELETE old incidents for this provider snapshot
    await this.incidentRepo.delete({
      currentSnapshot: { id: snapshot.id },
    });

    // 2️⃣ INSERT current incidents only
    for (const inc of incidents ?? []) {
      const entity = this.incidentRepo.create({
        name: inc.name,
        status: inc.status,
        impact: inc.impact,
        startedAt: inc.startedAt ? new Date(inc.startedAt) : undefined,
        link: inc.link,
        provider,
        currentSnapshot: snapshot,
      });

      await this.incidentRepo.save(entity);
    }
  }

  async getLatest() {
    return this.snapshotRepo.find({
      relations: ['provider', 'incidents'],
      order: { checkedAt: 'DESC' },
      take: 10,
    });
  }

  async saveSnapshots(services: any[]) {
    // map external ids → internal provider ids
    const providerIdMap: Record<string, string> = {
      openai: 'openai',
      'status.openai.com': 'openai',

      anthropic: 'anthropic',
      'status.anthropic.com': 'anthropic',

      grok: 'grok',
      'status.x.ai': 'grok',

      gemini: 'gemini',
      'status.cloud.google.com': 'gemini',
    };

    for (const svc of services) {
      const providerId = providerIdMap[svc.id];

      if (!providerId) {
        console.warn('Unknown provider, skipping:', svc.id);
        continue;
      }

      const provider = await this.providerRepo.findOne({
        where: { id: providerId },
      });

      if (!provider) {
        // This should NEVER happen if ProviderSeeder ran
        console.error('Provider missing:', providerId);
        continue;
      }

      const snapshot = this.snapshotRepo.create({
        provider,
        status: svc.status,
        message: svc.message,
        checkedAt: new Date(svc.lastChecked),
      });

      await this.snapshotRepo.save(snapshot);
    }
  }

  setLatestStatuses(services: ServiceStatus[]) {
    this.latestStatuses = services;
  }

  getLiveStatuses(): ServiceStatus[] {
    return this.latestStatuses;
  }

  private mergeRecentIncidents(
    live: Incident[],
    history: ProviderRecentIncident[],
  ) {
    return [
      // 🔴 LIVE incidents (investigating / monitoring)
      ...live.map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        impact: i.impact,
        startedAt: i.startedAt?.toISOString(),
        link: i.link,
      })),

      // ✅ RESOLVED incidents (historical)
      ...history.map((i) => ({
        id: i.externalId,
        name: i.name,
        status: 'resolved',
        impact: i.impact,
        startedAt: i.startedAt?.toISOString(),
        link: i.link,
      })),
    ];
  }

  
  async getLatestStatuses() {
  const providers = await this.providerRepo.find({
    relations: { snapshots: true },
  });

  return Promise.all(
    providers.map(async (provider) => {
      const latest = provider.snapshots
        ?.slice()
        .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())[0];

      const liveIncidents = await this.incidentRepo.find({
        where: { provider: { id: provider.id } },
      });

      // ✅ Per-provider query — each provider gets its own last 10
      const providerHistory = await this.recentIncidentService.getRecentByProvider(
        provider.id,
        10,
      );

      return {
        id: provider.id,
        name: provider.name,
        provider: provider.host,
        status: latest?.status ?? 'unknown',
        message: latest?.message ?? 'No data available',
        lastChecked: latest?.checkedAt?.toISOString() ?? null,
        incidents: [],
        components: [],
        recentIncidents: [
          ...liveIncidents.map((i) => ({
            id: i.id,
            name: i.name,
            status: i.status,
            impact: i.impact,
            startedAt: i.startedAt?.toISOString(),
            link: i.link,
          })),
          ...providerHistory,
        ],
      };
    }),
  );
}

  async getCurrentSnapshots() {
    return this.currentSnapshotRepo.find({
      relations: ['provider', 'incidents'],
      order: { checkedAt: 'DESC' },
    });
  }

  async upsertCurrentSnapshots(services: ServiceStatus[]) {
    const providerIdMap: Record<string, string> = {
      openai: 'openai',
      anthropic: 'anthropic',
      grok: 'grok',
      gemini: 'gemini',
      'status.openai.com': 'openai',
      'status.anthropic.com': 'anthropic',
      'status.x.ai': 'grok',
      'status.cloud.google.com': 'gemini',
    };

    for (const svc of services) {
      const providerCheckTime = new Date();
      const providerId = providerIdMap[svc.id];
      if (!providerId) continue;

      const provider = await this.providerRepo.findOneBy({ id: providerId });
      if (!provider) continue;

      let snapshot = await this.currentSnapshotRepo.findOne({
        where: { provider: { id: provider.id } },
        relations: ['provider'],
      });

      if (!snapshot) {
        snapshot = this.currentSnapshotRepo.create({ provider });
      }

      snapshot.status = svc.status;
      snapshot.message = svc.message;
      // snapshot.checkedAt = new Date(svc.lastChecked);
      snapshot.checkedAt = providerCheckTime;

      snapshot = await this.currentSnapshotRepo.save(snapshot);

      // 🔥 REPLACE incidents
      await this.replaceCurrentIncidents(
        snapshot,
        provider,
        svc.incidents ?? [],
      );
    }
  }

  async getSnapshotsForProvider(providerId: string, limit = 200) {
  return this.snapshotRepo.find({
    where: { provider: { id: providerId } },
    relations: ['provider'],
    order: { checkedAt: 'DESC' },
    take: limit,
    select: {
      id: true,
      status: true,
      checkedAt: true,
      message: true,
    },
  });
}
}
