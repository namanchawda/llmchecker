import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  // createApplicationContext = no HTTP server, no need for platform-express
  // Process stays alive because the cron timers keep the event loop running
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  console.log('✅ Worker started — crons active, no HTTP server');
}
bootstrap();