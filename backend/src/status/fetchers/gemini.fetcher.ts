// src/status/fetchers/gemini.fetcher.ts
//
// Source:  https://status.cloud.google.com/incidents.json
// Schema:  https://status.cloud.google.com/incidents.schema.json
//
// CONFIRMED real field names:
//   inc.id                          – stable string id
//   inc.external_desc               – incident title/summary
//   inc.begin                       – RFC3339 start time
//   inc.end                         – RFC3339 end time (ABSENT if still active)
//   inc.severity                    – "high" | "medium" (lowercase)
//   inc.uri                         – "incidents/<id>" (no leading slash)
//   inc.affected_products           – [{title: string, id: string}, ...]
//   inc.service_name                – deprecated string
//   inc.most_recent_update.status   – "AVAILABLE" = resolved
//   inc.status_impact               – "SERVICE_DISRUPTION" | "SERVICE_OUTAGE"

import { ServiceStatus, Incident, ServiceComponent } from './types';

const INCIDENTS_URL   = 'https://status.cloud.google.com/incidents.json';
const STATUS_BASE_URL = 'https://status.cloud.google.com';

const GEMINI_PRODUCT_KEYWORDS = [
  'gemini',
  'vertex ai',
  'vertex',
  'generative ai',
  'ai platform',
  'cloud ai',
  'dialogflow',
  'generative language',
  'model garden',
  'natural language',
  'translation',
  'speech',
  'vision ai',
  'automl',
  'document ai',
  'contact center ai',
  'agent assist',
  'retail api',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGeminiRelated(inc: any): boolean {
  const productTitles: string = Array.isArray(inc.affected_products)
    ? inc.affected_products.map((p: any) => String(p?.title ?? '')).join(' ')
    : '';

  const haystack = [
    inc.external_desc ?? '',
    inc.service_name  ?? '',
    productTitles,
  ].join(' ').toLowerCase();

  return GEMINI_PRODUCT_KEYWORDS.some(kw => haystack.includes(kw));
}

function isResolved(inc: any): boolean {
  if (inc.end) return true;
  return (inc.most_recent_update?.status ?? '').toUpperCase() === 'AVAILABLE';
}

function toIncidentStatus(inc: any): string {
  if (isResolved(inc)) return 'resolved';
  const raw = (inc.most_recent_update?.status ?? inc.status_impact ?? '').toUpperCase();
  if (raw.includes('OUTAGE'))     return 'investigating';
  if (raw.includes('DISRUPTION')) return 'investigating';
  return 'investigating';
}

function normalizeImpact(inc: any): Incident['impact'] {
  const sev = (inc.severity ?? '').toLowerCase();
  if (sev === 'high')   return 'critical';
  if (sev === 'medium') return 'major';
  return 'minor';
}

function buildLink(inc: any): string {
  if (inc.uri) {
    const uri = String(inc.uri);
    return uri.startsWith('http') ? uri : `${STATUS_BASE_URL}/${uri}`;
  }
  return `${STATUS_BASE_URL}/incidents/${inc.id}`;
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? undefined : d;
}

function mapIncident(inc: any): Incident {
  return {
    id:        inc.id,
    name:      inc.external_desc ?? 'Google Cloud incident',
    status:    toIncidentStatus(inc),
    impact:    normalizeImpact(inc),
    startedAt: inc.begin ?? undefined,
    link:      buildLink(inc),
    updates:   (inc.updates ?? [])
      .sort((a: any, b: any) =>
        new Date(b.when ?? 0).getTime() - new Date(a.when ?? 0).getTime()
      )
      .slice(0, 5)
      .map((u: any) => ({
        body:   u.text   ?? '',
        at:     u.when   ?? '',
        status: (u.status ?? '').toLowerCase(),
      })),
  };
}

function componentStatusFromActive(
  keywords: string[],
  activeRaw: any[],
): ServiceComponent['status'] {
  const hit = activeRaw.some(inc => {
    const productTitles = Array.isArray(inc.affected_products)
      ? inc.affected_products.map((p: any) => String(p?.title ?? '')).join(' ')
      : '';
    const text = `${inc.external_desc ?? ''} ${productTitles}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });
  return hit ? 'partial_outage' : 'operational';
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchGeminiStatus(): Promise<ServiceStatus> {
  const now = new Date().toISOString();

  try {
    const res = await fetch(INCIDENTS_URL);
    if (!res.ok) throw new Error(`incidents.json responded ${res.status}`);

    const allIncidents: any[] = await res.json();
    if (!Array.isArray(allIncidents)) throw new Error('Expected array');

    const gemini      = allIncidents.filter(isGeminiRelated);
    const activeRaw   = gemini.filter(inc => !isResolved(inc));

    // Sort resolved newest-first, take 10
    const resolvedRaw = gemini
      .filter(inc => isResolved(inc))
      .sort((a, b) => {
        const da = parseDate(a.end ?? a.begin)?.getTime() ?? 0;
        const db = parseDate(b.end ?? b.begin)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 10);

    const incidents: Incident[]       = activeRaw.map(mapIncident);
    const recentIncidents: Incident[] = resolvedRaw.map(mapIncident);

    let status: ServiceStatus['status'] = 'operational';
    if (activeRaw.length > 0) {
      const hasCritical = activeRaw.some(i => (i.severity ?? '').toLowerCase() === 'high');
      status = hasCritical ? 'outage' : 'partial_outage';
    }

    const components: ServiceComponent[] = [
      { id: 'gemini-api',          name: 'Gemini API',              group: 'Gemini',    status: componentStatusFromActive(['gemini', 'vertex gemini'], activeRaw) },
      { id: 'vertex-ai-gen',       name: 'Vertex AI Generative AI', group: 'Vertex AI', status: componentStatusFromActive(['vertex ai online prediction', 'vertex ai generative'], activeRaw) },
      { id: 'vertex-ai-platform',  name: 'Vertex AI Platform',      group: 'Vertex AI', status: componentStatusFromActive(['vertex ai platform', 'vertex ai'], activeRaw) },
      { id: 'cloud-ai-platform',   name: 'Cloud AI Platform',       group: 'Vertex AI', status: componentStatusFromActive(['ai platform', 'cloud ai', 'automl'], activeRaw) },
      { id: 'google-workspace-ai', name: 'Google Workspace AI',     group: 'Gemini',    status: componentStatusFromActive(['workspace', 'google workspace'], activeRaw) },
    ];

    return {
      id:          'gemini',
      name:        'Gemini (Google)',
      provider:    'status.cloud.google.com',
      status,
      message:     activeRaw.length
        ? `${activeRaw.length} active incident${activeRaw.length > 1 ? 's' : ''} affecting Gemini services`
        : 'All Gemini services operational',
      lastChecked:     now,
      incidents,
      components,
      recentIncidents,
    };

  } catch (err: any) {
    return {
      id:          'gemini',
      name:        'Gemini (Google)',
      provider:    'status.cloud.google.com',
      status:      'unknown',
      message:     `Failed to fetch: ${err.message}`,
      lastChecked: now,
      incidents:   [],
      components: [
        { id: 'gemini-api',          name: 'Gemini API',              status: 'unknown', group: 'Gemini' },
        { id: 'vertex-ai-gen',       name: 'Vertex AI Generative AI', status: 'unknown', group: 'Vertex AI' },
        { id: 'vertex-ai-platform',  name: 'Vertex AI Platform',      status: 'unknown', group: 'Vertex AI' },
        { id: 'cloud-ai-platform',   name: 'Cloud AI Platform',       status: 'unknown', group: 'Vertex AI' },
        { id: 'google-workspace-ai', name: 'Google Workspace AI',     status: 'unknown', group: 'Gemini' },
      ],
      recentIncidents: [],
    };
  }
}