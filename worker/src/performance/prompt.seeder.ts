import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from './entities/prompt.entity';

@Injectable()
export class PromptSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,
  ) {}

  async onModuleInit() {
    const count = await this.promptRepo.count();
    if (count > 0) return;

    await this.promptRepo.save([
      {
        name: 'Basic health check',
        content: 'Say "OK" if you are working.',
        isActive: true,
      },
    //   {
    //     name: 'Latency test',
    //     content: 'Respond with a single word.',
    //     isActive: true,
    //   },
    ]);

    console.log('✅ Default prompts seeded');
  }
}
