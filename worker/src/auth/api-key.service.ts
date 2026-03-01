import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // 🔑 Buy API key
  async buyApiKey(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new ForbiddenException();

    if (!user.apiKey) {
      user.apiKey = 'llm_' + randomBytes(24).toString('hex');
      user.apiKeyQuota = 100;
      await this.userRepo.save(user);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      apiKey: user.apiKey,
      apiKeyQuota: user.apiKeyQuota,
    };
  }


  // 📉 Use API key
  async useApiKey(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new ForbiddenException();

    if (!user.apiKey || user.apiKeyQuota <= 0) {
      throw new ForbiddenException('Quota exhausted');
    }

    user.apiKeyQuota -= 1;
    return this.userRepo.save(user);
  }
}