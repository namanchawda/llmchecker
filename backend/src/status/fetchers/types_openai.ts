/**
 * Additional type definitions for OpenAI Status API
 * These complement your existing types.ts file
 */

import { ServiceComponent, ServiceStatus, Incident } from './types';

// Raw status values from OpenAI API (before normalization)
export type RawComponentStatus = 
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance';

// Normalized status (matches your ServiceComponent['status'] and ServiceStatus['status'])
export type NormalizedStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'outage'
  | 'maintenance'
  | 'unknown';

/**
 * API Response Types - Raw structures from OpenAI API
 */

export interface AffectedComponent {
  component_id: string;
  status: RawComponentStatus;
  current_status?: RawComponentStatus;
}

export interface ComponentImpact {
  start_at: string;
  id: string;
  component_id: string;
  status_page_incident_id: string;
  status: RawComponentStatus;
}

export interface IncidentUpdateRaw {
  published_at: string;
  id: string;
  message?: {
    type: string;
    content: Array<{
      type: string;
      content?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  message_string?: string;
  to_status: string;
  component_statuses?: Array<{
    component_id: string;
    status: RawComponentStatus;
  }>;
  automated_update: boolean;
}

export interface OngoingIncident {
  updates: IncidentUpdateRaw[];
  component_impacts: ComponentImpact[];
  status_summaries: Array<{
    start_at: string;
    worst_component_status: RawComponentStatus;
  }>;
  published_at: string;
  id: string;
  status_page_id: string;
  name: string;
  status: string;
  affected_components: AffectedComponent[];
  type: string;
}

export type ComponentRaw = {
  id: string;
  name: string;
  status:
    | 'operational'
    | 'degraded_performance'
    | 'partial_outage'
    | 'major_outage'
    | 'under_maintenance';
  created_at?: string;
  updated_at?: string;
  position?: number;
  page_id?: string;
};

export interface OpenAISummaryResponse {
  summary: {
    id: string;
    name: string;
    subpath: string;
    support_label: string;
    public_url: string;
    logo_url: string;
    favicon_url: string;
    components: ComponentRaw[];
    subscriptions_disabled: boolean;
    display_uptime_mode: string;
    allow_search_engine_indexing: boolean;
    affected_components: AffectedComponent[];
    ongoing_incidents: OngoingIncident[];
    scheduled_maintenances: any[];
    structure: any;
    expose_status_summary_api: boolean;
    theme: string;
    date_view: string;
    locale: string;
    page_type: string;
    data_available_since: string;
    footer_text: any;
    page_view_tracking_disabled: boolean;
    page_level_subscriptions_disabled: boolean;
    subscribe_button_highlighted: boolean;
  };
}

/**
 * Utility types for common use cases
 */

export interface AffectedService {
  name: string;
  status: NormalizedStatus;
  severity: 'low' | 'medium' | 'high';
}

export interface ApiServicesStatus {
  overall: NormalizedStatus;
  message: string;
  services: Array<{
    name: string;
    status: NormalizedStatus;
    isOperational: boolean;
  }>;
  incidents: Incident[];
}