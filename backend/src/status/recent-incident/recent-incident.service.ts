// src/status/recent-incident/recent-incident.service.ts
//
// Single source of truth for ALL incidents — active and resolved.
//
// Table behaviour:
//   - Active incidents are upserted every cron tick (status kept up to date)
//   - When an active incident resolves, its row is updated to status='resolved'
//   - The table keeps: ALL active incidents + up to 10 resolved per provider
//   - When resolved count exceeds 10, the oldest resolved rows are trimmed
//
// This means:
//   - Incident stream: query rows WHERE status != 'resolved'
//   - Recent incidents panel: query rows WHERE status = 'resolved' LIMIT 10

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';

import { Provider } from '../entities/provider.entity';
import { ProviderRecentIncident } from '../entities/provider-recent-incident.entity';
import { Incident } from '../fetchers/types';

const MAX_RESOLVED_PER_PROVIDER = 10;

@Injectable()
export class RecentIncidentService {
  private readonly logger = new Logger(RecentIncidentService.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(ProviderRecentIncident)
    private readonly incidentRepo: Repository<ProviderRecentIncident>,
  ) {}

  /**
   * Ingest both active AND resolved incidents for a provider.
   *
   * Rules:
   *   - Active incidents: upserted (inserted or updated). Never trimmed.
   *   - Resolved incidents: upserted. After upsert, resolved rows trimmed to 10 newest.
   *   - If a previously-active incident is now resolved: its status is updated to 'resolved'.
   *
   * Called every cron tick for all providers.
   */
  async ingest(providerId: string, incidents: Incident[]) {
    if (!incidents?.length) return;

    const provider = await this.providerRepo.findOne({ where: { id: providerId } });
    if (!provider) {
      this.logger.warn(`Provider "${providerId}" not found — skipping ingest`);
      return;
    }

    let inserted = 0;
    let updated  = 0;

    for (const inc of incidents) {
      const externalId = (inc.id || `${providerId}::${inc.name}::${inc.startedAt}`).slice(0, 255);
      if (!externalId) continue;

      const normalizedStatus = this.normalizeStatus(inc.status);

      const existing = await this.incidentRepo.findOne({
        where: { provider: { id: providerId }, externalId },
        relations: ['provider'],
      });

      if (existing) {
        // Always update — status may have changed from 'investigating' → 'resolved'
        existing.name      = inc.name;
        existing.status    = normalizedStatus;
        existing.impact    = this.normalizeImpact(inc);
        existing.link      = inc.link ?? existing.link;
        existing.startedAt = inc.startedAt ? new Date(inc.startedAt) : existing.startedAt;
        await this.incidentRepo.save(existing);
        updated++;
      } else {
        try {
          const row = this.incidentRepo.create({
            provider,
            externalId,
            name:      inc.name,
            status:    normalizedStatus,
            impact:    this.normalizeImpact(inc),
            startedAt: inc.startedAt ? new Date(inc.startedAt) : undefined,
            link:      inc.link,
          });
          await this.incidentRepo.save(row);
          inserted++;
        } catch (err: any) {
          if (err.code !== '23505') throw err;
        }
      }
    }

    // Trim resolved rows — keep only the 10 newest resolved per provider
    // Active rows are never trimmed (there should be very few at any time)
    await this.trimResolved(providerId);

    this.logger.log(`[${providerId}] ${inserted} inserted, ${updated} updated`);
  }

  /**
   * Trim resolved incidents to MAX_RESOLVED_PER_PROVIDER newest.
   * Active incidents are never trimmed.
   */
  private async trimResolved(providerId: string) {
    const resolvedRows = await this.incidentRepo.find({
      where:  { provider: { id: providerId }, status: 'resolved' },
      order:  { startedAt: 'DESC', createdAt: 'DESC' },
      select: ['id'],
    });

    if (resolvedRows.length > MAX_RESOLVED_PER_PROVIDER) {
      const toDelete = resolvedRows.slice(MAX_RESOLVED_PER_PROVIDER).map(r => r.id);
      await this.incidentRepo.delete({ id: In(toDelete) });
      this.logger.log(`[${providerId}] Trimmed ${toDelete.length} old resolved incident(s)`);
    }
  }

  // ── Normalization helpers ────────────────────────────────────────────────────

  /**
   * Normalize provider-specific status strings to our internal values.
   *   'available' (Google) → 'resolved'
   *   anything non-resolved → 'investigating'
   */
  private normalizeStatus(raw: string | undefined): string {
    const s = (raw ?? '').toLowerCase();
    if (s === 'resolved' || s === 'available') return 'resolved';
    return s || 'investigating';
  }

  private normalizeImpact(inc: Incident): string | undefined {
    if (inc.impact) return inc.impact;
    const name = (inc.name ?? '').toLowerCase();
    if (name.includes('outage'))                                return 'critical';
    if (name.includes('degraded') || name.includes('partial')) return 'major';
    return 'minor';
  }

  // ── Query methods ────────────────────────────────────────────────────────────

  /**
   * All ACTIVE (non-resolved) incidents across all providers.
   * Used for the incident stream / timeline.
   */
  async getActive() {
    return this.incidentRepo.find({
      where:     { status: Not('resolved') },
      relations: ['provider'],
      order:     { startedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * All incidents (active + resolved) for all providers — last N total.
   * Default 40 = 10 resolved × 4 providers + any active.
   */
  async getRecent(limit = 40) {
    return this.incidentRepo.find({
      relations: ['provider'],
      order:     { startedAt: 'DESC', createdAt: 'DESC' },
      take:      limit,
    });
  }

  /**
   * All incidents for a specific provider (active + resolved), newest first.
   */
  async getRecentByProvider(providerId: string, limit = MAX_RESOLVED_PER_PROVIDER) {
    return this.incidentRepo.find({
      where:     { provider: { id: providerId } },
      relations: ['provider'],
      order:     { startedAt: 'DESC', createdAt: 'DESC' },
      take:      limit,
    });
  }
}