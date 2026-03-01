import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from './entities/provider.entity';

@Injectable()
export class ProviderSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Provider)
    private readonly repo: Repository<Provider>,
  ) {}

  async onModuleInit() {
    const providers = [
      { id: 'openai', name: 'OpenAI', host: 'status.openai.com' },
      { id: 'anthropic', name: 'Anthropic Claude', host: 'status.anthropic.com' },
      { id: 'gemini', name: 'Gemini (Google)', host: 'status.cloud.google.com' },
      { id: 'grok', name: 'Grok (xAI)', host: 'status.x.ai' },
    ];

    for (const p of providers) {
      const exists = await this.repo.findOne({ where: { id: p.id } });
      if (!exists) await this.repo.save(p);
    }

    console.log('✅ Providers seeded');
  }
}