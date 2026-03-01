import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prompt } from './entities/prompt.entity';
import { PerformanceRun } from './entities/performance-run.entity';
import { Provider } from '../status/entities/provider.entity';
import { getExecutor } from '../performance/executors/executer.factory';
import { OpenAIExecutor } from './executors/openai.executor';
import { AnthropicExecutor } from './executors/anthropic.executor';
import { GeminiExecutor } from './executors/gemini.executor';
import { GrokExecutor } from './executors/grok.executor';
import { CurrentPerformanceRun } from './entities/current-performance-run.entity'


@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(Prompt)
    private readonly promptRepo: Repository<Prompt>,

    @InjectRepository(PerformanceRun)
    private readonly runRepo: Repository<PerformanceRun>,

    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,

    @InjectRepository(CurrentPerformanceRun)
    private readonly currentRunRepo: Repository<CurrentPerformanceRun>,


    private readonly openaiExecutor: OpenAIExecutor,
    private readonly anthropicExecutor: AnthropicExecutor,
    private readonly geminiExecutor: GeminiExecutor,
    private readonly grokExecutor: GrokExecutor,

  ) {}

  // ✅ Create a prompt (admin / system use for now)
  async createPrompt(name: string, content: string) {
    const prompt = this.promptRepo.create({
      name,
      content,
    });

    return this.promptRepo.save(prompt);
  }

  // ✅ List active prompts
  async getActivePrompts() {
    return this.promptRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ✅ Store a performance run (used later by executor)
  async saveRun(params: {
    provider: Provider;
    prompt: Prompt;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
  }) {
    const run = this.runRepo.create({
      provider: params.provider,
      prompt: params.prompt,
      latencyMs: params.latencyMs,
      success: params.success,
      errorType: params.errorType,
      errorMessage: params.errorMessage,
    });

    return this.runRepo.save(run);
  }

  // ✅ Public dashboard query (aggregated)
  async getRecentRuns(limit = 50) {
    return this.runRepo.find({
      take: limit,
      order: { executedAt: 'DESC' },
    });
  }

  

  async runAllChecks() {
    const prompts = await this.getActivePrompts();
    const providers = await this.providerRepo.find();

    for (const provider of providers) {
      const executor = getExecutor(provider, {
        openai: this.openaiExecutor,
        anthropic: this.anthropicExecutor,
        gemini: this.geminiExecutor,
        grok: this.grokExecutor,
      });

      if (!executor) {
        console.warn(`⚠️ No executor for provider ${provider.id}`);
        continue;
      }

      let latestRun: PerformanceRun | null = null;

      for (const prompt of prompts) {
        const start = Date.now();

        let result;
        try {
          result = await executor.execute(prompt.content);
        } catch (err: any) {
          result = {
            success: false,
            latencyMs: Date.now() - start,
            errorType: 'executor_error',
            errorMessage: err?.message ?? 'Unknown error',
          };
        }

        // 1️⃣ Save historical run
        const run = await this.saveRun({
          provider,
          prompt,
          latencyMs: result.latencyMs ?? Date.now() - start,
          success: result.success,
          errorType: result.errorType,
          errorMessage: result.errorMessage,
        });

        // keep last run for "current" table
        latestRun = run;
      }

      // 2️⃣ UPSERT current_performance_run (1 row per provider)
      if (latestRun) {
        const providerCheckTime = new Date();
        await this.currentRunRepo.upsert(
          {
            provider: latestRun.provider,
            prompt: latestRun.prompt,
            latencyMs: latestRun.latencyMs,
            success: latestRun.success,
            errorType: latestRun.errorType,
            errorMessage: latestRun.errorMessage,
            // executedAt: latestRun.executedAt,
            executedAt: providerCheckTime,
          },
          ['provider'], // 🔑 UNIQUE constraint column
        );
      }
    }
  }

  async getLiveRuns() {
  const rows = await this.currentRunRepo.find({
    relations: ['provider', 'prompt'],
  });

  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    prompt: row.prompt,
    latencyMs: row.latencyMs,
    success: row.success,
    errorType: row.errorType,
    errorMessage: row.errorMessage,

    // ✅ THIS IS THE FIX
    lastChecked: row.executedAt?.toISOString(),
  }));
}

}