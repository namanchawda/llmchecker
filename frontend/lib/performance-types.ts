export type LivePerformanceRun = {
  id: string;
  latencyMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  lastChecked: string;
  provider: {
    id: string;
    name: string;
    host: string;
  };
};
