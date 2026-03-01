import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceRun } from './entities/performance-run.entity';
import { Prompt } from './entities/prompt.entity';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { Provider } from '../status/entities/provider.entity';
import { PerformanceScheduler } from './performance.scheduler';
import { OpenAIExecutor } from './executors/openai.executor';
import { AnthropicExecutor } from './executors/anthropic.executor';
import { GeminiExecutor } from './executors/gemini.executor';
import { GrokExecutor } from './executors/grok.executor';
import { PromptSeeder } from './prompt.seeder';
import { CurrentPerformanceRun } from './entities/current-performance-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceRun, Prompt, Provider, CurrentPerformanceRun])],
  providers: [
        PerformanceService, 
        PerformanceScheduler, 
        OpenAIExecutor, 
        AnthropicExecutor, 
        GeminiExecutor, 
        GrokExecutor,
        PromptSeeder
    ],
  controllers: [PerformanceController],
})
export class PerformanceModule {}
