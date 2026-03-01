import { Incident } from '../lib/types';
import { StatusBadge } from './StatusBadge';

type TimelineItem = {
  service: string;
  incident: Incident;
};

function deriveBadge(incident: Incident) {
  if (incident.status === 'resolved') return 'operational';

  switch (incident.impact) {
    case 'critical':
      return 'outage';
    case 'major':
      return 'partial_outage';
    case 'minor':
      return 'degraded';
    default:
      return 'degraded';
  }
}

export function IncidentTimeline({
  incidents,
}: {
  incidents: TimelineItem[];
}) {
  if (!incidents?.length) {
    return (
      <div className="card">
        <div className="text-slate-400">
          No active incidents across providers
        </div>
      </div>
    );
  }

  const sorted = [...incidents].sort((a, b) => {
    const aTime = a.incident.startedAt
      ? Date.parse(a.incident.startedAt)
      : 0;
    const bTime = b.incident.startedAt
      ? Date.parse(b.incident.startedAt)
      : 0;
    return bTime - aTime;
  });

  return (
    <div className="card">
      <div className="relative pl-10">

        {/* vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-white/10" />

        <div className="flex gap-4">
          {sorted.map(({ service, incident }) => {
            const dotColor =
              incident.impact === 'critical'
                ? 'bg-red-400'
                : incident.status === 'resolved'
                ? 'bg-emerald-400'
                : 'bg-amber-400';

            return (
              <div
                key={`${service}-${incident.id}`}
                className="relative flex items-start gap-4"
              >
                {/* dot */}
                <div
                  className={`
                    absolute left-[2px] top-5
                    w-2.5 h-2.5
                    rounded-full
                    ${dotColor}
                    shadow-[0_0_10px_rgba(255,255,255,0.25)]
                  `}
                />

                {/* NEW CARD STYLE */}
                <div
                  className="
                    group relative overflow-hidden
                    rounded-xl
                    border border-white/10
                    bg-gradient-to-b from-white/[0.04] to-white/[0.02]
                    px-4 py-3
                    transition-all
                    hover:border-white/20
                    hover:bg-white/[0.05]
                    hover:shadow-[0_10px_30px_rgba(0,0,0,0.35)]
                    max-w-xl
                  "
                >
                  {/* header */}
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <div className="font-semibold tracking-tight">
                        {service}
                      </div>

                      <div className="text-xs text-slate-400">
                        {incident.startedAt
                          ? new Date(
                              incident.startedAt,
                            ).toLocaleString()
                          : 'Time unknown'}
                      </div>
                    </div>

                    <StatusBadge status={deriveBadge(incident)} />
                  </div>

                  {/* title */}
                  <div className="text-sm font-medium mb-2">
                    {incident.name}
                  </div>

                  {/* link */}
                  {incident.link && (
                    <a
                      href={incident.link}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        text-sm
                        text-emerald-400
                        hover:text-emerald-300
                        transition
                      "
                    >
                      View incident →
                    </a>
                  )}

                  {/* light sweep */}
                  <div
                    className="
                      pointer-events-none
                      absolute inset-0
                      opacity-0
                      group-hover:opacity-100
                      transition
                      bg-gradient-to-r
                      from-transparent
                      via-white/[0.04]
                      to-transparent
                    "
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
