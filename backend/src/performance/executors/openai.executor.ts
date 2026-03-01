import { ProviderExecutor, ExecutionResult } from './provider-executor.interface';

export class OpenAIExecutor implements ProviderExecutor {
  async execute(prompt: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: prompt,
        }),
      });
      console.log('OPENAI KEY LOADED : ', !!process.env.OPENAI_API_KEY);

      if (!res.ok) {
        return {
          latencyMs: Date.now() - start,
          success: false,
          errorType: 'api_error',
          errorMessage: await res.text(),
        };
      }

      return {
        latencyMs: Date.now() - start,
        success: true,
      };
    } catch (err) {
      return {
        latencyMs: Date.now() - start,
        success: false,
        errorType: 'network_error',
        errorMessage: (err as Error).message,
      };
    }
  }
}
