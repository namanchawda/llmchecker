// frontend/lib/types.ts

export type IncidentUpdate = {
  body: string;
  at: string;
  status: string;
};

export type Incident = {
  id: string;
  name: string;
  status: string;
  impact?: 'none' | 'minor' | 'major' | 'critical';
  startedAt?: string;
  link?: string;
  updates?: IncidentUpdate[];
};

export type ServiceComponent = {
  id: string;
  name: string;
  status:
    | 'operational'
    | 'degraded'
    | 'degraded_performance'
    | 'partial_outage'
    | 'outage'
    | 'major_outage'
    | 'maintenance'
    | 'unknown';
  description?: string | null;
  group?: string | null;
};

export type ServiceStatus = {
  id: string;
  name: string;
  provider: string;

  status:
    | 'operational'
    | 'degraded'
    | 'degraded_performance'
    | 'partial_outage'
    | 'outage'
    | 'major_outage'
    | 'maintenance'
    | 'unknown';

  lastChecked: string;
  message?: string;

  // 🔴 CURRENT INCIDENTS (from incident table)
  incidents: Incident[];

  // 🧩 SERVICE DRILLDOWN (provider_component_status)
  components?: ServiceComponent[];

  // 🟡 HISTORICAL INCIDENTS (provider_recent_incident)
  recentIncidents?: Incident[];
};

export interface MonitorJob {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  intervalSeconds: number;
  isActive: boolean;
  createdAt: string;
}

export interface MonitorRun {
  id: string;
  success: boolean;
  responseTimeMs: number;
  responseText?: string;
  errorType?: string;
  httpStatus?: number;
  createdAt: string;
}