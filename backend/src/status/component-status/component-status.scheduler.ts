// import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { ComponentStatusService } from './component-status.service';

// @Injectable()
// export class ComponentStatusScheduler {
//   private readonly logger = new Logger(ComponentStatusScheduler.name);
//   private running = false;

//   constructor(private readonly service: ComponentStatusService) {}

//   @Cron('*/1 * * * *')
//   async run() {
//     if (this.running) return;
//     this.running = true;

//     try {
//       this.logger.log('Syncing provider components');
//       await this.service.syncAll();
//     } finally {
//       this.running = false;
//     }
//   }
// }
