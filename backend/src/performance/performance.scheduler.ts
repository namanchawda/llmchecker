import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PerformanceService } from './performance.service';

@Injectable()
export class PerformanceScheduler {
  private readonly logger = new Logger(PerformanceScheduler.name);
  private running = false;

  constructor(private readonly performanceService: PerformanceService) {}

  @Cron('*/5 * * * *')
  async runLiveMonitoring() {
    if (this.running) {
      this.logger.warn('Performance cron already running, skipping');
      return;
    }

    this.running = true;

    try {
      this.logger.log('Running live performance monitoring...');
      await this.performanceService.runAllChecks();
    } finally {
      this.running = false;
    }
  }
}
