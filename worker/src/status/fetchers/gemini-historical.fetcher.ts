// src/status/fetchers/gemini-historical.fetcher.ts
//
// Source:  https://status.cloud.google.com/incidents.json
// Schema:  https://status.cloud.google.com/incidents.schema.json
//
// Strategy: cast the widest possible net — match ANY incident that has at least
// one AI/ML product in its affected_products list, sorted newest-first.

import { Incident } from './types';

const INCIDENTS_URL   = 'https://status.cloud.google.com/incidents.json';
const STATUS_BASE_URL = 'https://status.cloud.google.com';

// ── Product ID allowlist (stable IDs from schema) ─────────────────────────────
// These are the known stable product IDs for Gemini/Vertex/AI products.
// Using IDs is more reliable than keyword-matching titles (which are "unstable").
// Add more from https://status.cloud.google.com/products.json if needed.
const GEMINI_PRODUCT_IDS = new Set([
  'sdXM79fz1FS6ekNpu37K', // Vertex AI Online Prediction
  'BnCicQdHSdxaCv8Ya6Vm', // Dialogflow CX
  'yjXrEg3Yvy26BauMwr69', // (Dialogflow ES - from data)
  'kchyUtnkMHJWaAva8aYc', // Google App Engine (AI features)
]);

// ── Keyword fallback (title-based, catches anything ID list misses) ────────────
const GEMINI_TITLE_KEYWORDS = [
  'gemini',
  'vertex ai',
  'vertex',
  'generative ai',
  'ai platform',
  'cloud ai',
  'google ai',
  'dialogflow',
  'generative language',
  'model garden',
  'natural language api',
  'translation',
  'speech-to-text',
  'text-to-speech',
  'vision ai',
  'automl',
  'document ai',
  'contact center ai',
  'agent assist',
  'retail api',
  'recommendations ai',
  'vertex',
  'colab enterprise',
  'looker',
];

function isGeminiRelated(inc: any): boolean {
  if (!Array.isArray(inc.affected_products)) return false;

  for (const product of inc.affected_products) {
    // Check by stable product ID first
    if (product?.id && GEMINI_PRODUCT_IDS.has(product.id)) return true;

    // Fallback: check product title keywords
    const title = (product?.title ?? '').toLowerCase();
    if (GEMINI_TITLE_KEYWORDS.some(kw => title.includes(kw))) return true;
  }

  // Also check external_desc in case affected_products is empty
  const desc = (inc.external_desc ?? '').toLowerCase();
  return GEMINI_TITLE_KEYWORDS.some(kw => desc.includes(kw));
}

function isResolved(inc: any): boolean {
  if (inc.end) return true;
  return (inc.most_recent_update?.status ?? '').toUpperCase() === 'AVAILABLE';
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

function parseTs(raw: string | undefined): number {
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Returns the 10 most-recent RESOLVED Gemini/Vertex AI incidents,
 * sorted newest-first by end date.
 *
 * Also exported as `debugFetchGeminiIncidents` so the controller can expose
 * a /status/debug/gemini endpoint to inspect what the fetcher finds at runtime.
 */
export async function fetchGeminiHistoricalIncidents(): Promise<Incident[]> {
  const { resolved } = await fetchAndClassifyGeminiIncidents();
  return resolved.slice(0, 10);
}

/** Exposed for the debug endpoint — returns both active + resolved with counts */
export async function fetchAndClassifyGeminiIncidents(): Promise<{
  total: number;
  matched: number;
  active: Incident[];
  resolved: Incident[];
}> {
  const res = await fetch(INCIDENTS_URL);
  if (!res.ok) throw new Error(`incidents.json responded ${res.status}`);

  const all: any[] = await res.json();
  if (!Array.isArray(all)) throw new Error('Expected array');

  const matched  = all.filter(isGeminiRelated);
  const activeRaw   = matched.filter(inc => !isResolved(inc));
  const resolvedRaw = matched
    .filter(isResolved)
    .sort((a, b) => parseTs(b.end ?? b.begin) - parseTs(a.end ?? a.begin));

  const toIncident = (inc: any, resolved: boolean): Incident => ({
    id:        inc.id,
    name:      inc.external_desc ?? 'Google Cloud incident',
    status:    resolved ? 'resolved' : 'investigating',
    impact:    normalizeImpact(inc),
    startedAt: inc.begin ?? undefined,
    link:      buildLink(inc),
    updates:   (inc.updates ?? [])
      .sort((a: any, b: any) => parseTs(b.when) - parseTs(a.when))
      .slice(0, 5)
      .map((u: any) => ({
        body:   u.text   ?? '',
        at:     u.when   ?? '',
        status: (u.status ?? '').toLowerCase(),
      })),
  });

  return {
    total:    all.length,
    matched:  matched.length,
    active:   activeRaw.map(i => toIncident(i, false)),
    resolved: resolvedRaw.map(i => toIncident(i, true)),
  };
}