export interface ExecutionResult {
  latencyMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
}

export interface ProviderExecutor {
  execute(prompt: string): Promise<ExecutionResult>;
}
