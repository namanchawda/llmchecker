import { Controller, Get, Query, Param } from '@nestjs/common';
import { StatusService } from './status.service';
import { ComponentStatusService } from './component-status/component-status.service';

@Controller('status')
export class StatusController {
  constructor(
    private readonly statusService: StatusService,
    private readonly componentStatusService: ComponentStatusService,
  ) {}

  // 📜 Historical (derived from history table)
  @Get('latest')
  async latest() {
    return this.statusService.getLatestStatuses();
  }

  // ⚡ LIVE (from current_status_snapshot table)
  @Get('live')
  async live() {
    return this.statusService.getCurrentSnapshots();
  }

  // 🔍 Service-level drilldown (DB-backed)
  @Get('components')
  async getComponents() {
    return this.componentStatusService.getGroupedByProvider();
  }

  @Get('snapshots/:providerId')
  async getSnapshots(
    @Param('providerId') providerId: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 500) : 200;
    return this.statusService.getSnapshotsForProvider(providerId, take);
  }
}
