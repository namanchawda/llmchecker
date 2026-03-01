import { fetchOpenAiStatus } from './openai.fetcher';
import { fetchAnthropicStatus } from './anthropic.fetcher';
import { fetchGeminiStatus } from './gemini.fetcher';
import { fetchGrokStatus } from './grok.fetcher';
import { ServiceStatus } from './types';

export async function fetchAllProviderStatuses(): Promise<ServiceStatus[]> {
  return Promise.all([
    fetchOpenAiStatus(),
    fetchAnthropicStatus(),
    fetchGeminiStatus(),
    fetchGrokStatus(),
  ]);
}
