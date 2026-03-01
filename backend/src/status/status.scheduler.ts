// src/status/status.scheduler.ts
//
// Every cron tick, for each provider:
//   - active incidents (svc.incidents[])   → ingested so stream stays live
//   - resolved incidents (recentIncidents[]) → ingested so recent panel is populated
//
// Both go through the same ingest() call — the service handles the distinction.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StatusService } from './status.service';
import { fetchAllProviderStatuses } from './fetchers/fetch-all-statuses';
import { ComponentStatusService } from './component-status/component-status.service';
import { RecentIncidentService } from './recent-incident/recent-incident.service';
import { fetchOpenAiHistoricalIncidents } from './fetchers/openai-historical.fetcher';
import { fetchGeminiHistoricalIncidents } from './fetchers/gemini-historical.fetcher';

@Injectable()
export class StatusScheduler {
  private readonly logger = new Logger(StatusScheduler.name);
  private running = false;

  constructor(
    private readonly statusService: StatusService,
    private readonly componentStatusService: ComponentStatusService,
    private readonly recentIncidentService: RecentIncidentService,
  ) {}

  @Cron('*/1 * * * *')
  async runStatusMonitoring() {
    if (this.running) {
      this.logger.warn('Status cron already running, skipping');
      return;
    }

    this.running = true;

    try {
      this.logger.log('Running status monitoring cron');

      const services = await fetchAllProviderStatuses();

      // 1️⃣ Historical snapshots
      await this.statusService.saveSnapshots(services);

      // 2️⃣ Current snapshot table (used for provider status badge + response time)
      await this.statusService.upsertCurrentSnapshots(services);

      // 3️⃣ Component status drilldown
      await this.componentStatusService.upsertFromServices(services);

      // 4️⃣ In-memory cache
      this.statusService.setLatestStatuses(services);

      // 5️⃣ Unified incident ingest — active + resolved into provider_recent_incident
      //
      // For each provider we merge:
      //   svc.incidents[]        — currently active/investigating
      //   svc.recentIncidents[]  — last N resolved (from fetcher)
      //
      // OpenAI + Gemini: also fetch dedicated historical endpoints for resolved history
      // since their main status APIs don't surface enough historical data.

      const providerIdMap: Record<string, string> = {
        openai:                    'openai',
        'status.openai.com':       'openai',
        anthropic:                 'anthropic',
        'status.anthropic.com':    'anthropic',
        grok:                      'grok',
        'status.x.ai':             'grok',
        gemini:                    'gemini',
        'status.cloud.google.com': 'gemini',
      };

      for (const svc of services) {
        const providerId = providerIdMap[svc.id] ?? providerIdMap[svc.provider];
        if (!providerId) {
          this.logger.warn(`Unknown provider: ${svc.id}`);
          continue;
        }

        // Merge active + resolved from the main fetcher, deduplicated by id
        const seen = new Set<string>();
        const allIncidents = [
          ...(svc.incidents       ?? []),  // active right now
          ...(svc.recentIncidents ?? []),  // resolved history from fetcher
        ].filter(inc => {
          const key = inc.id || inc.name;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (allIncidents.length) {
          this.logger.log(`[${providerId}] Ingesting ${allIncidents.length} incidents (${(svc.incidents ?? []).length} active, ${(svc.recentIncidents ?? []).length} resolved)`);
          await this.recentIncidentService.ingest(providerId, allIncidents);
        }
      }

      // ── OpenAI: dedicated historical endpoint for resolved incident history ──
      try {
        const history = await fetchOpenAiHistoricalIncidents();
        this.logger.log(`OpenAI historical: ${history.length} resolved incidents`);
        await this.recentIncidentService.ingest('openai', history);
      } catch (err) {
        this.logger.error('OpenAI historical fetch failed', err);
      }

      // ── Gemini: dedicated historical endpoint for resolved incident history ──
      try {
        const history = await fetchGeminiHistoricalIncidents();
        this.logger.log(`Gemini historical: ${history.length} resolved incidents`);
        await this.recentIncidentService.ingest('gemini', history);
      } catch (err) {
        this.logger.error('Gemini historical fetch failed', err);
      }

    } catch (err) {
      this.logger.error('Status cron failed', err);
    } finally {
      this.running = false;
    }
  }
}