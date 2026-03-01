import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PerformanceRun } from './entities/performance-run.entity';
import { CurrentPerformanceRun } from './entities/current-performance-run.entity';
import { Prompt } from './entities/prompt.entity';
import { Provider } from '../status/entities/provider.entity';
import { PerformanceService } from './performance.service';
import { PerformanceScheduler } from './performance.scheduler';
import { PromptSeeder } from './prompt.seeder';
import { OpenAIExecutor } from './executors/openai.executor';
import { AnthropicExecutor } from './executors/anthropic.executor';
import { GeminiExecutor } from './executors/gemini.executor';
import { GrokExecutor } from './executors/grok.executor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformanceRun,
      CurrentPerformanceRun,
      Prompt,
      Provider,
    ]),
  ],
  providers: [
    PerformanceService,
    PerformanceScheduler,   // ← cron runs here
    PromptSeeder,
    OpenAIExecutor,
    AnthropicExecutor,
    GeminiExecutor,
    GrokExecutor,
  ],
  // No controllers
})
export class WorkerPerformanceModule {}