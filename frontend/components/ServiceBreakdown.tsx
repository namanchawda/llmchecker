import { ServiceStatus } from '../lib/types';
import { StatusBadge } from './StatusBadge';

export function ServiceBreakdown({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="grid-auto">
      {services.map((s) => (
        <div
          key={s.id}
          className="
            card
            transition
            hover:bg-white/[0.04]
            hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]
          "
        >
          {/* HEADER */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-base font-semibold tracking-tight">
                {s.name}
              </div>

              <div className="muted small mt-0.5">
                {s.provider}
              </div>
            </div>

            <StatusBadge status={s.status} />
          </div>

          {/* COMPONENTS */}
          {s.components?.length ? (
            <div className="flex flex-col gap-2">
              {s.components.map((c) => (
                <div
                  key={c.id}
                  className="
                    flex justify-between items-center
                    px-3 py-2
                    rounded-xl
                    border border-white/10
                    bg-white/[0.02]

                    transition
                    hover:bg-white/[0.05]
                  "
                >
                  <div>
                    <div className="text-sm font-medium">
                      {c.name}
                    </div>

                    {c.description && (
                      <div className="muted small">
                        {c.description}
                      </div>
                    )}
                  </div>

                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="muted small">
              No component data
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
