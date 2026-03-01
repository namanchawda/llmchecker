import { OpenAIExecutor } from './openai.executor';
import { AnthropicExecutor } from './anthropic.executor';
import { GeminiExecutor } from './gemini.executor';
import { GrokExecutor } from './grok.executor';
import { Provider } from '../../status/entities/provider.entity';

export function getExecutor(
  provider: Provider,
  executors: {
    openai: OpenAIExecutor;
    anthropic: AnthropicExecutor;
    gemini: GeminiExecutor;
    grok: GrokExecutor;
  }
) {
  switch (provider.id) {
    case 'openai':
      return executors.openai;
    case 'anthropic':
      return executors.anthropic;
    case 'gemini':
      return executors.gemini;
    case 'grok':
      return executors.grok;
    default:
      return null;
  }
}