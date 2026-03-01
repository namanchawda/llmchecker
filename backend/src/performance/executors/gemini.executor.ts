// gemini.executor.ts
import { ProviderExecutor, ExecutionResult } from './provider-executor.interface';

export class GeminiExecutor implements ProviderExecutor {
  async execute(): Promise<ExecutionResult> {
    return {
      latencyMs: 0,
      success: false,
      errorType: 'not_implemented',
      errorMessage: 'Gemini executor not implemented yet',
    };
  }
}