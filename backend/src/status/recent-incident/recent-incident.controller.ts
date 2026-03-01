// src/status/recent-incident/recent-incident.controller.ts

import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RecentIncidentService } from './recent-incident.service';
import {
  fetchAndClassifyGeminiIncidents,
  fetchGeminiHistoricalIncidents,
} from '../fetchers/gemini-historical.fetcher';
import { fetchOpenAiHistoricalIncidents } from '../fetchers/openai-historical.fetcher';

@Controller('status')
export class RecentIncidentController {
  constructor(
    private readonly recentIncidentService: RecentIncidentService,
  ) {}

  /**
   * All incidents (active + resolved) across all providers — last N total.
   * GET /status/recent-incidents?limit=40
   */
  @Get('recent-incidents')
  async getRecentIncidents(@Query('limit') limit?: string) {
    const take = limit ? Number(limit) : 40;
    return this.recentIncidentService.getRecent(take);
  }

  /**
   * All incidents for a single provider (active + resolved).
   * GET /status/recent-incidents/gemini?limit=10
   */
  @Get('recent-incidents/:providerId')
  async getRecentByProvider(
    @Param('providerId') providerId: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Number(limit) : 10;
    return this.recentIncidentService.getRecentByProvider(providerId, take);
  }

  /**
   * ACTIVE incidents only (status != 'resolved') — used for incident stream/timeline.
   * Replaces the old GET /status/live incident source.
   * GET /status/active-incidents
   */
  @Get('active-incidents')
  async getActiveIncidents() {
    return this.recentIncidentService.getActive();
  }

  /**
   * 🔍 DEBUG — see exactly what the Gemini fetcher finds in incidents.json
   * GET /status/debug/gemini-incidents
   */
  @Get('debug/gemini-incidents')
  async debugGeminiIncidents() {
    try {
      const result = await fetchAndClassifyGeminiIncidents();
      return {
        ok:              true,
        totalInJson:     result.total,
        matchedGemini:   result.matched,
        activeCount:     result.active.length,
        resolvedCount:   result.resolved.length,
        willStoreInDB:   result.resolved.slice(0, 10).map(i => ({
          id:        i.id,
          name:      i.name,
          impact:    i.impact,
          startedAt: i.startedAt,
          link:      i.link,
        })),
        allResolvedNames: result.resolved.map(i => ({
          id:        i.id,
          name:      i.name,
          startedAt: i.startedAt,
        })),
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * 🔄 MANUAL SYNC — force-ingest now without waiting for cron.
   * POST /status/sync-incidents
   */
  @Post('sync-incidents')
  async syncIncidents() {
    const results: Record<string, any> = {};

    try {
      const history = await fetchGeminiHistoricalIncidents();
      await this.recentIncidentService.ingest('gemini', history);
      results.gemini = { fetched: history.length, status: 'ok' };
    } catch (err: any) {
      results.gemini = { status: 'error', error: err.message };
    }

    try {
      const history = await fetchOpenAiHistoricalIncidents();
      await this.recentIncidentService.ingest('openai', history);
      results.openai = { fetched: history.length, status: 'ok' };
    } catch (err: any) {
      results.openai = { status: 'error', error: err.message };
    }

    return { synced: true, results };
  }
}