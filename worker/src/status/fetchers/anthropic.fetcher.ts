import { ServiceStatus, Incident, ServiceComponent } from './types';

const STATUS_URL = 'https://status.anthropic.com/api/v2/status.json';
const UNRESOLVED_URL = 'https://status.anthropic.com/api/v2/incidents/unresolved.json';
const HISTORY_URL = 'https://status.anthropic.com/api/v2/incidents.json';
const COMPONENTS_URL = 'https://status.anthropic.com/api/v2/components.json';

function normalizeIncidentStatus(status?: string): string {
  if (!status) return 'unknown';

  switch (status) {
    case 'postmortem':
      return 'resolved';

    case 'resolved':
    case 'monitoring':
    case 'investigating':
    case 'identified':
      return status;

    default:
      return status;
  }
}

export async function fetchAnthropicStatus(): Promise<ServiceStatus> {
  const now = new Date().toISOString();

  try {
    const [
      statusRes,
      unresolvedRes,
      historyRes,
      componentsRes,
    ] = await Promise.all([
      fetch(STATUS_URL),
      fetch(UNRESOLVED_URL),
      fetch(HISTORY_URL),
      fetch(COMPONENTS_URL),
    ]);

    const statusJson = await statusRes.json();
    const unresolvedJson = await unresolvedRes.json();
    const historyJson = await historyRes.json();
    const componentsJson = await componentsRes.json();

    const indicator = statusJson?.status?.indicator ?? 'unknown';

    const statusMap: Record<string, ServiceStatus['status']> = {
      none: 'operational',
      minor: 'degraded',
      major: 'partial_outage',
      critical: 'outage',
      maintenance: 'maintenance',
    };

    const status = statusMap[indicator] ?? 'unknown';

    const incidents: Incident[] =
      unresolvedJson?.incidents?.map((i: any) => ({
        id: i.id,
        name: i.name,
        status: normalizeIncidentStatus(i.status),
        impact: i.impact,
        startedAt: i.started_at,
        link: i.shortlink,
        updates: (i.incident_updates || []).map((u: any) => ({
          body: u.body,
          at: u.created_at,
          status: u.status,
        })),
      })) ?? [];

    const recentIncidents: Incident[] =
      historyJson?.incidents?.slice(0, 30).map((i: any) => ({
        id: i.id,
        name: i.name,
        status: normalizeIncidentStatus(i.status),
        impact: i.impact,
        startedAt: i.started_at,
        link: i.shortlink,
        updates: (i.incident_updates || []).map((u: any) => ({
          body: u.body,
          at: u.created_at,
          status: u.status,
        })),
      })) ?? [];

    const components: ServiceComponent[] =
      componentsJson?.components?.map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        description: c.description ?? undefined,
      })) ?? [];

    return {
      id: 'anthropic',
      name: 'Anthropic Claude',
      provider: 'status.anthropic.com',
      status,
      message: statusJson?.status?.description ?? 'Operational',
      lastChecked: now,
      incidents,
      components,
      recentIncidents,
    };
  } catch (err: any) {
    return {
      id: 'anthropic',
      name: 'Anthropic Claude',
      provider: 'status.anthropic.com',
      status: 'unknown',
      message: err.message,
      lastChecked: now,
      incidents: [],
      components: [],
      recentIncidents: [],
    };
  }
}