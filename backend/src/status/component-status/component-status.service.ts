// src/status/component-status/component-status.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';

import { Provider } from '../entities/provider.entity';
import { ProviderComponentStatus } from '../entities/provider-component-status.entity';
import { ServiceStatus, ServiceComponent } from '../fetchers/types';

@Injectable()
export class ComponentStatusService {
  private readonly logger = new Logger(ComponentStatusService.name);

  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(ProviderComponentStatus)
    private readonly componentRepo: Repository<ProviderComponentStatus>,
  ) {}

  /**
   * 🔍 GROUPED READ (provider → components)
   */
  async getGroupedByProvider() {
    const rows = await this.componentRepo.find({
      relations: ['provider'],
      order: {
        provider: { id: 'ASC' },
        name: 'ASC',
      },
    });

    const grouped = new Map<
      string,
      {
        providerId: string;
        providerName: string;
        providerHost: string;
        components: {
          id: string;
          name: string;
          status: string;
          description?: string;
          group?: string;
        }[];
      }
    >();

    for (const row of rows) {
      if (!grouped.has(row.provider.id)) {
        grouped.set(row.provider.id, {
          providerId:   row.provider.id,
          providerName: row.provider.name,
          providerHost: row.provider.host,
          components:   [],
        });
      }

      grouped.get(row.provider.id)!.components.push({
        id:          row.id,
        name:        row.name,
        status:      row.status,
        description: row.description,
        group:       row.group,
      });
    }

    return Array.from(grouped.values());
  }

  /**
   * 🔄 REPLACE component status for ALL providers.
   *
   * For each provider, this is a full replace:
   *   1. Upsert every component in the new list (insert or update)
   *   2. Delete any DB rows whose componentKey is NOT in the new list
   *
   * This ensures stale components (e.g. old hardcoded ones that no longer
   * exist on the provider's real status page) are automatically removed.
   */
  async upsertFromServices(services: ServiceStatus[]) {
    for (const service of services) {
      if (!service.components || service.components.length === 0) continue;

      const provider = await this.providerRepo.findOne({
        where: { id: service.id },
      });

      if (!provider) {
        this.logger.warn(`Provider not found: ${service.id}`);
        continue;
      }

      await this.replaceProviderComponents(provider, service.components);
    }
  }

  /**
   * Full replace for one provider:
   * upsert incoming components, then delete any that are no longer present.
   */
  private async replaceProviderComponents(
    provider: Provider,
    components: ServiceComponent[],
  ) {
    const incomingKeys = components.map(c =>
      this.buildComponentKey(provider.id, c),
    );

    // ── Step 1: Upsert all incoming components ────────────────────────────────
    for (const component of components) {
      const componentKey = this.buildComponentKey(provider.id, component);

      const existing = await this.componentRepo.findOne({
        where: { provider: { id: provider.id }, componentKey },
        relations: ['provider'],
      });

      if (existing) {
        existing.status      = component.status;
        existing.name        = component.name;
        existing.group       = component.group;
        existing.description = component.description ?? undefined;
        await this.componentRepo.save(existing);
      } else {
        const created = this.componentRepo.create({
          provider,
          componentKey,
          name:        component.name,
          group:       component.group,
          status:      component.status,
          description: component.description,
        });
        await this.componentRepo.save(created);
      }
    }

    // ── Step 2: Delete stale components no longer in the fetcher's list ───────
    const stale = await this.componentRepo.find({
      where: {
        provider:     { id: provider.id },
        componentKey: Not(In(incomingKeys)),
      },
    });

    if (stale.length > 0) {
      await this.componentRepo.remove(stale);
      this.logger.log(
        `[${provider.id}] Removed ${stale.length} stale component(s): ${stale.map(s => s.name).join(', ')}`,
      );
    }
  }

  /**
   * 🔑 Stable component key (provider + normalized name)
   */
  private buildComponentKey(providerId: string, component: ServiceComponent) {
    return `${providerId}-${component.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`;
  }

  /**
   * 🔍 Read current components for ONE provider
   */
  async getCurrentByProvider(providerId: string) {
    return this.componentRepo.find({
      where: { provider: { id: providerId } },
      order: { name: 'ASC' },
    });
  }

  /**
   * 🔍 Read ALL current components (flat)
   */
  async getAllCurrent() {
    return this.componentRepo.find({
      relations: ['provider'],
      order: {
        provider: { id: 'ASC' },
        name:     'ASC',
      },
    });
  }
}