/**
 * Maps raw OpenAI API status values to normalized application status values
 */

// Raw status from OpenAI API
export type RawComponentStatus = 
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance';

// Normalized status for application
export type NormalizedStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'outage'
  | 'maintenance'
  | 'unknown';

export const STATUS_MAP: Record<RawComponentStatus, NormalizedStatus> = {
  operational: 'operational',
  degraded_performance: 'degraded',
  partial_outage: 'partial_outage',
  major_outage: 'outage',
  under_maintenance: 'maintenance',
};

export function normalizeIndicator(status: RawComponentStatus): NormalizedStatus {
  return STATUS_MAP[status] ?? 'unknown';
}

export function getStatusSeverity(status: NormalizedStatus): number {
  const severityMap: Record<NormalizedStatus, number> = {
    operational: 0,
    maintenance: 1,
    degraded: 2,
    partial_outage: 3,
    outage: 4,
    unknown: 5,
  };
  
  return severityMap[status] ?? 5;
}

export function isProblemStatus(status: NormalizedStatus): boolean {
  return !['operational', 'maintenance'].includes(status);
}

export function getStatusDescription(status: NormalizedStatus): string {
  const descriptions: Record<NormalizedStatus, string> = {
    operational: 'All systems operational',
    degraded: 'Experiencing performance issues',
    partial_outage: 'Some services unavailable',
    outage: 'Major service disruption',
    maintenance: 'Scheduled maintenance in progress',
    unknown: 'Status unknown',
  };
  
  return descriptions[status] ?? 'Status unknown';
}

export function getStatusColor(status: NormalizedStatus): string {
  const colors: Record<NormalizedStatus, string> = {
    operational: '#22c55e',
    degraded: '#eab308',
    partial_outage: '#f97316',
    outage: '#ef4444',
    maintenance: '#3b82f6',
    unknown: '#6b7280',
  };
  
  return colors[status] ?? '#6b7280';
}

export function getStatusIcon(status: NormalizedStatus): string {
  const icons: Record<NormalizedStatus, string> = {
    operational: '✓',
    degraded: '⚠',
    partial_outage: '⚠',
    outage: '✗',
    maintenance: '🔧',
    unknown: '?',
  };
  
  return icons[status] ?? '?';
}