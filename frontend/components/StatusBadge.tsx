import { ServiceStatus } from '../lib/types';

type Props = {
  status: ServiceStatus['status'];
};

const statusLabel: Record<string, string> = {
  operational:          'Operational',
  degraded:             'Degraded',
  degraded_performance: 'Degraded',
  partial_outage:       'Partial Outage',
  outage:               'Outage',
  major_outage:         'Major Outage',
  maintenance:          'Maintenance',
  unknown:              'Unknown',
};

const statusClass: Record<string, string> = {
  operational:          'badge badge--success',
  degraded:             'badge badge--warn',
  degraded_performance: 'badge badge--warn',
  partial_outage:       'badge badge--alert',
  outage:               'badge badge--alert',
  major_outage:         'badge badge--alert',
  maintenance:          'badge badge--neutral',
  unknown:              'badge badge--neutral',
};

export function StatusBadge({ status }: Props) {
  const label = statusLabel[status] ?? status.replace(/_/g, ' ');
  const cls   = statusClass[status]  ?? 'badge badge--neutral';
  return (
    <span className={cls}>{label}</span>
  );
}