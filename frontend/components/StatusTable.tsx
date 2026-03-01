import { ServiceStatus } from "../lib/types";
import { LivePerformanceRun } from "../lib/performance-types";
import { StatusBadge } from "./StatusBadge";

const PROVIDER_ID_MAP: Record<string, string> = {
  "status.openai.com": "openai",
  "status.anthropic.com": "anthropic",
  "status.cloud.google.com": "gemini",
  "status.x.ai": "grok",
};

export function StatusTable({
  services,
  runs,
}: {
  services: ServiceStatus[];
  runs: LivePerformanceRun[];
}) {
  function latencyColor(ms: number) {
    if (ms < 800) return "text-emerald-400";
    if (ms < 1500) return "text-amber-400";
    return "text-red-400";
  }

  const runMap = Object.fromEntries(
    runs.map((r) => [r.provider.id, r])
  );

  return (
    <div className="card overflow-hidden">
      {/* HEADER */}
      <div
        className="
          grid
          grid-cols-[1.6fr_0.8fr_0.8fr_1fr_1fr_1fr]
          gap-4
          px-4 py-3
          text-xs uppercase tracking-wider
          text-slate-400
          border-b border-white/10
          bg-white/[0.02]
        "
      >
        <div>Service</div>
        <div>Status</div>
        <div>Response Time</div>
        <div>Health</div>
        <div>Incidents</div>
        <div>Last checked</div>
      </div>

      {/* ROWS */}
      {services.map((s) => {
        const providerId = PROVIDER_ID_MAP[s.provider];
        const run = providerId ? runMap[providerId] : undefined;

        return (
          <div
            key={s.id}
            className="
              grid
              grid-cols-[1.6fr_0.8fr_0.8fr_1fr_1fr_1fr]
              gap-4
              px-4 py-4
              items-center
              border-b border-white/5
              odd:bg-white/[0.01]
              hover:bg-white/[0.04]
              transition
            "
          >
            {/* SERVICE */}
            <div>
              <div className="font-semibold text-base">{s.name}</div>
              <div className="text-slate-400 text-xs">{s.provider}</div>
            </div>

            {/* STATUS (Provider-reported) */}
            <div className="flex items-center">
              <StatusBadge status={s.status} />
            </div>

            {/* LATENCY */}
            <div className="font-mono">
              {run?.success ? (
                <span className={latencyColor(run.latencyMs)}>
                  {run.latencyMs} ms
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>

            {/* HEALTH (Real execution) */}
            <div>
              {run ? (
                run.success ? (
                  <span className="badge badge--success">
                    Healthy
                  </span>
                ) : (
                  <span className="badge badge--alert">
                    Fail
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-sm">—</span>
              )}
            </div>

            {/* INCIDENTS (count) */}
            <div className="flex items-center">
              {s.incidents.length > 0 ? (
                <span className="inline-flex min-w-[24px] justify-center px-2 py-1 text-s font-semibold text-red-400">
                  {s.incidents.length}
                </span>
              ) : (
                <span className="inline-flex min-w-[24px] justify-center px-2 py-1 font-semibold text-slate-400 text-s">0</span>
              )}
            </div>

            {/* LAST CHECKED */}
            <div className="text-slate-400 text-sm whitespace-nowrap">
              {s.lastChecked
                ? new Date(s.lastChecked).toLocaleString()
                : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
