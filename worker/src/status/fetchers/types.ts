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
    | 'partial_outage'
    | 'outage'
    | 'maintenance'
    | 'unknown';
  description?: string;
  group?: string;
};

export type ServiceStatus = {
  id: string;
  name: string;
  provider: string;
  status:
    | 'operational'
    | 'degraded'
    | 'partial_outage'
    | 'outage'
    | 'maintenance'
    | 'unknown';
  lastChecked: string;
  message?: string;
  incidents: Incident[];
  components?: ServiceComponent[];
  recentIncidents?: Incident[];
};
