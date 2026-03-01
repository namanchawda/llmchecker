import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderAlertSubscription } from './provider-alert-subscription.entity';

@Injectable()
export class ProviderAlertService {
  constructor(
    @InjectRepository(ProviderAlertSubscription)
    private readonly repo: Repository<ProviderAlertSubscription>,
  ) {}

  async getSubscriptions(userId: string): Promise<ProviderAlertSubscription[]> {
    return this.repo.find({ where: { userId } });
  }

  async setAlert(
    userId: string,
    providerId: string,
    alertsEnabled: boolean,
  ): Promise<ProviderAlertSubscription> {
    let sub = await this.repo.findOne({ where: { userId, providerId } });
    if (sub) {
      sub.alertsEnabled = alertsEnabled;
    } else {
      sub = this.repo.create({ userId, providerId, alertsEnabled });
    }
    return this.repo.save(sub);
  }

  async getSubscription(
    userId: string,
    providerId: string,
  ): Promise<ProviderAlertSubscription | null> {
    return this.repo.findOne({ where: { userId, providerId } }) ?? null;
  }
}