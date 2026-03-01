import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusModule } from './status/status.module';
import { PerformanceModule } from './performance/performance.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { NotificationModule } from './notifications/notification.module';
import { ProviderAlertModule } from './provider-alerts/provider-alert.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_NAME ?? 'llm_monitor',
      autoLoadEntities: true,

      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      migrationsTableName: 'typeorm_migrations',
    }),
    StatusModule,
    PerformanceModule,
    AuthModule,
    MonitoringModule,
    NotificationModule,
    ProviderAlertModule,
  ],
})
export class AppModule {}