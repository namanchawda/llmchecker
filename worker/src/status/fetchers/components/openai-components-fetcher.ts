export type FetchedComponent = {
  id: string;
  name: string;
  status: string;
  group?: string;
};

const OPENAI_COMPONENTS_URL =
  'https://status.openai.com/api/v2/components.json';

export async function fetchOpenAIComponents(): Promise<FetchedComponent[]> {
  const res = await fetch(OPENAI_COMPONENTS_URL);
  if (!res.ok) throw new Error('OpenAI components fetch failed');

  const data = await res.json();

  const groups: Record<string, string> = {};
  for (const g of data.component_groups ?? []) {
    groups[g.id] = g.name;
  }

  return (data.components ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    group: c.group_id ? groups[c.group_id] : undefined,
  }));
}
