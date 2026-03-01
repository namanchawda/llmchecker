import { ServiceStatus, ServiceComponent, Incident } from './types';
import {
  AffectedComponent,
  OngoingIncident,
  ComponentRaw,
  OpenAISummaryResponse,
  RawComponentStatus,
  NormalizedStatus,
  ApiServicesStatus,
  AffectedService,
} from './types_openai';
import { normalizeIndicator } from './status-map';

const OPENAI_STATUS_API = 'https://status.openai.com/api/v2/status.json';
const OPENAI_SUMMARY_API = 'https://status.openai.com/api/v2/summary.json';

/* -------------------- helpers -------------------- */

/**
 * Map OpenAI page-level status indicator to normalized status
 */
function mapOpenAiPageIndicator(
  indicator?: string
): NormalizedStatus {
  switch (indicator) {
    case 'none':
      return 'operational';
    case 'minor':
      return 'degraded';
    case 'major':
      return 'partial_outage';
    case 'critical':
      return 'outage';
    default:
      return 'unknown';
  }
}

function stripCdata(value?: string): string {
  if (!value) return '';
  return value.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

/**
 * Determine overall status based on affected components
 */
function determineOverallStatus(affectedComponents: AffectedComponent[]): RawComponentStatus {
  if (!affectedComponents || affectedComponents.length === 0) {
    return 'operational';
  }

  const statuses = affectedComponents.map(c => c.status);
  
  if (statuses.includes('major_outage')) return 'major_outage';
  if (statuses.includes('partial_outage')) return 'partial_outage';
  if (statuses.includes('degraded_performance')) return 'degraded_performance';
  
  return 'operational';
}

/**
 * Map component status to normalized status
 */
function mapComponentStatus(
  componentId: string,
  affectedComponents: AffectedComponent[]
): NormalizedStatus {
  const affected = affectedComponents.find(
    ac => ac.component_id === componentId
  );
  
  // If affected, normalize the raw status, otherwise return operational
  return affected ? normalizeIndicator(affected.status) : 'operational';
}

/* -------------------- MAIN FETCHER -------------------- */

export async function fetchOpenAiStatus(): Promise<ServiceStatus> {
  const now = new Date().toISOString();

  try {
    const res = await fetch(OPENAI_SUMMARY_API);
    if (!res.ok) {
      throw new Error(`OpenAI fetch failed: ${res.status}`);
    }

    const data = await res.json();

    /* ---------------- Overall Status ---------------- */
    const pageIndicator = data.status?.indicator;

    /* ---------------- Components ---------------- */
    const components: ServiceComponent[] = (data.components || []).map(
      (comp: ComponentRaw) => ({
        id: comp.id,
        name: comp.name,
        status: normalizeIndicator(comp.status),
      })
    );

    /* ---------------- Incidents ---------------- */
    const incidents: Incident[] = (data.incidents || []).map((incident: any) => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      impact: incident.impact ?? undefined,
      startedAt: incident.created_at,
      link: `https://status.openai.com/incidents/${incident.id}`,
      updates: (incident.incident_updates || []).map((u: any) => ({
        body: stripCdata(u.body),
        at: u.created_at,
        status: u.status,
      })),
    }));

    return {
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com',
      status: mapOpenAiPageIndicator(pageIndicator),
      message: data.status?.description ?? 'Status unavailable',
      lastChecked: now,
      components,
      incidents,
      recentIncidents: [],
    };
  } catch (err) {
    return {
      id: 'openai',
      name: 'OpenAI',
      provider: 'status.openai.com',
      status: 'unknown',
      message: (err as Error).message,
      lastChecked: now,
      components: [],
      incidents: [],
      recentIncidents: [],
    };
  }
}
/* -------------------- Helper Functions -------------------- */

/**
 * Extract text content from incident.io's rich text format
 */
function extractTextFromDoc(messageDoc: any): string {
  if (!messageDoc || !messageDoc.content) return '';
  
  return messageDoc.content
    .map((block: any) => {
      if (block.type === 'paragraph' && block.content) {
        return block.content
          .map((item: any) => item.text || '')
          .join('');
      }
      return '';
    })
    .join(' ')
    .trim();
}

/**
 * Determine impact level from affected component statuses
 */
function determineImpactFromStatus(affectedComponents: AffectedComponent[]): Incident['impact'] {
  if (!affectedComponents || affectedComponents.length === 0) {
    return undefined;
  }

  const statuses = affectedComponents.map((c: AffectedComponent) => c.status);

  if (statuses.includes('major_outage')) return 'critical';
  if (statuses.includes('partial_outage')) return 'major';
  if (statuses.includes('degraded_performance')) return 'minor';

  return undefined;
}

/**
 * Get human-readable status message
 */
function getStatusMessage(status: RawComponentStatus, incidents: OngoingIncident[]): string {
  if (status === 'operational') {
    return 'All Systems Operational';
  }

  if (incidents.length > 0) {
    return `${incidents.length} ongoing incident${incidents.length > 1 ? 's' : ''}`;
  }

  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/* -------------------- Alternative: Fetch specific components -------------------- */

/**
 * Fetch status for specific OpenAI services only
 */
export async function fetchOpenAiStatusForServices(
  serviceIds: string[]
): Promise<ServiceStatus> {
  const fullStatus = await fetchOpenAiStatus();

  // Filter components to only include requested services
  const filteredComponents = (fullStatus.components || []).filter(comp =>
    serviceIds.includes(comp.id)
  );

  // Filter incidents to only those affecting requested services
  const filteredIncidents = (fullStatus.incidents || []).filter(incident =>
    incident.updates?.some(update =>
      serviceIds.some(id => update.body?.includes(id))
    )
  );

  return {
    ...fullStatus,
    components: filteredComponents,
    incidents: filteredIncidents,
  };
}

/* -------------------- Usage Examples -------------------- */

/**
 * Example: Get status for specific API services
 */
export async function getApiServicesStatus(): Promise<ApiServicesStatus> {
  const status = await fetchOpenAiStatus();
  
  // Filter to only API-related components
  const apiComponents = (status.components || []).filter(comp =>
    ['Chat Completions', 'Embeddings', 'Batch', 'Images', 'Audio', 'Realtime'].includes(comp.name)
  );

  return {
    overall: status.status,
    message: status.message ?? 'Status unavailable',
    services: apiComponents.map(comp => ({
      name: comp.name,
      status: comp.status,
      isOperational: comp.status === 'operational',
    })),
    incidents: status.incidents,
  };
}

/**
 * Example: Check if a specific service is operational
 */
export async function isServiceOperational(serviceName: string): Promise<boolean> {
  const status = await fetchOpenAiStatus();
  
  const service = (status.components || []).find(
    comp => comp.name.toLowerCase() === serviceName.toLowerCase()
  );

  return service ? service.status === 'operational' : false;
}

/**
 * Example: Get all affected services
 */
export async function getAffectedServices(): Promise<AffectedService[]> {
  const status = await fetchOpenAiStatus();
  
  return (status.components || [])
    .filter(comp => comp.status !== 'operational')
    .map(comp => ({
      name: comp.name,
      status: comp.status,
      severity: comp.status.includes('major') ? 'high' : 
                comp.status.includes('partial') ? 'medium' : 'low',
    }));
}