import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { WorkerStatusModule } from './status/worker-status.module';
import { WorkerPerformanceModule } from './performance/worker-performance.module';
import { WorkerMonitoringModule } from './monitoring/worker-monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'llm_monitor',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
    }),
    WorkerStatusModule,
    WorkerPerformanceModule,
    WorkerMonitoringModule,
  ],
})
export class WorkerModule {}