import { ProviderExecutor, ExecutionResult } from './provider-executor.interface';

export class AnthropicExecutor implements ProviderExecutor {
  async execute(prompt: string): Promise<ExecutionResult> {
    return {
      latencyMs: 0,
      success: false,
      errorType: 'not_implemented',
      errorMessage: 'Anthropic executor not implemented yet',
    };
  }
}
