import { FetchedComponent } from '../components/openai-components-fetcher';

const ANTHROPIC_COMPONENTS_URL =
  'https://status.anthropic.com/api/v2/components.json';

export async function fetchAnthropicComponents(): Promise<FetchedComponent[]> {
  const res = await fetch(ANTHROPIC_COMPONENTS_URL);
  if (!res.ok) throw new Error('Anthropic components fetch failed');

  const data = await res.json();

  return (data.components ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    group: 'Anthropic',
  }));
}
