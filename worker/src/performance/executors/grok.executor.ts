import { ProviderExecutor, ExecutionResult } from './provider-executor.interface';

export class GrokExecutor implements ProviderExecutor {
  async execute(_: string): Promise<ExecutionResult> {
    return {
      latencyMs: 0,
      success: false,
      errorType: 'not_implemented',
      errorMessage: 'Grok executor not implemented yet',
    };
  }
}