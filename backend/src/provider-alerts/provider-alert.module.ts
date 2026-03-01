import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderAlertSubscription } from './provider-alert-subscription.entity';
import { ProviderAlertService } from './provider-alert.service';
import { ProviderAlertController } from './provider-alert.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderAlertSubscription])],
  providers: [ProviderAlertService],
  controllers: [ProviderAlertController],
  exports: [ProviderAlertService],
})
export class ProviderAlertModule {}