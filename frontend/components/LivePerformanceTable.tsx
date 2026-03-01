import { LivePerformanceRun } from '../lib/performance-types';

export function LivePerformanceTable({
  runs,
}: {
  runs: LivePerformanceRun[];
}) {
  if (!runs.length) {
    return (
      <div className="card">
        <div className="text-slate-400">No live performance data.</div>
      </div>
    );
  }

  function latencyColor(ms: number) {
    if (ms < 800) return "text-emerald-400";
    if (ms < 1500) return "text-amber-400";
    return "text-red-400";
  }

  return (
    <div className="card overflow-hidden">

      {/* HEADER */}
      <div
        className="
          grid grid-cols-[1.4fr_0.8fr_0.8fr_1fr]
          gap-4
          px-4 py-3
          text-xs uppercase tracking-wider
          text-slate-400
          border-b border-white/10
          bg-white/[0.02]
        "
      >
        <div>Provider</div>
        <div>Status</div>
        <div>Latency</div>
        <div>Last Check</div>
      </div>

      {/* ROWS */}
      {runs.map((run) => (
        <div
          key={run.id}
          className="
            grid grid-cols-[1.4fr_0.8fr_0.8fr_1fr]
            gap-4
            px-4 py-4
            items-center
            border-b border-white/5
            transition
            hover:bg-white/[0.03]
          "
        >
          {/* Provider */}
          <div>
            <div className="font-semibold">
              {run.provider.name}
            </div>

            <div className="text-slate-400 text-xs">
              {run.provider.host}
            </div>
          </div>

          {/* Status */}
          <div>
            {run.success ? (
              <span className="badge badge--success">
                Healthy
              </span>
            ) : (
              <span className="badge badge--alert">
                Fail
              </span>
            )}
          </div>

          {/* Latency */}
          <div className="font-mono">
            {run.success ? (
              <span className={latencyColor(run.latencyMs)}>
                {run.latencyMs} ms
              </span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>

          {/* Time */}
          <div className="text-slate-400 text-sm whitespace-nowrap">
            {new Date(run.lastChecked).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
