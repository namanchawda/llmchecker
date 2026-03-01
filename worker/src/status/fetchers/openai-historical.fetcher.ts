// src/status/fetchers/openai-historical.fetcher.ts

import { Incident } from './types';

const OPENAI_INCIDENTS_API = 'https://status.openai.com/api/v2/incidents.json';

/**
 * Fetch the last 10 resolved OpenAI incidents (historical).
 * Source of truth for the provider_recent_incident table.
 */
export async function fetchOpenAiHistoricalIncidents(): Promise<Incident[]> {
  const res = await fetch(OPENAI_INCIDENTS_API);

  if (!res.ok) {
    throw new Error(`Failed to fetch OpenAI incidents: ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data.incidents)) return [];

  return data.incidents
    .filter((incident: any) => incident.status === 'resolved')
    .slice(0, 10) // Last 10 only
    .map((incident: any): Incident => ({
      id:        incident.id,
      name:      incident.name,
      status:    'resolved',
      impact:    incident.impact ?? undefined,
      startedAt: incident.created_at,
      link:      `https://status.openai.com/incidents/${incident.id}`,
      updates:   (incident.incident_updates || []).map((u: any) => ({
        body:   u.body ?? '',
        at:     u.created_at,
        status: u.status,
      })),
    }));
}