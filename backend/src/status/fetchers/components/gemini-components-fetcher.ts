import { FetchedComponent } from '../components/openai-components-fetcher';

export async function fetchGeminiComponents(): Promise<FetchedComponent[]> {
  // synthetic but stable
  return [
    {
      id: 'gemini-api',
      name: 'Gemini APIs',
      status: 'operational',
      group: 'Gemini',
    },
    {
      id: 'vertex-ai-generative',
      name: 'Vertex AI Generative',
      status: 'operational',
      group: 'Google Cloud',
    },
  ];
}
