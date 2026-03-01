"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PaginatedIncidentTable } from "./PaginatedIncidentTable";
import {
  Activity, Clock, AlertTriangle, CheckCircle, Pause, Pencil,
  MoreHorizontal, ChevronLeft, ChevronRight, Bell, BellOff,
} from "lucide-react";
import { toggleJobAlerts } from "../app/api/monitor";

/* ─── helpers ─────────────────────────────────────────────── */

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m, ${diff % 60}s ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d, ${Math.floor((diff % 86400) / 3600)}h ago`;
}

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "–";
  return `${ms} ms`;
}

function uptimeWindows(incidents: any[]) {
  const now = Date.now();
  const calc = (windowMs: number) => {
    const overlapping = incidents.filter((i) => {
      const start = new Date(i.startedAt).getTime();
      const end = i.resolvedAt ? new Date(i.resolvedAt).getTime() : now;
      return start < now && end > now - windowMs;
    });
    const countInWindow = incidents.filter(
      (i) => new Date(i.startedAt).getTime() >= now - windowMs
    ).length;
    let downtimeMs = 0;
    overlapping.forEach((inc) => {
      const s = Math.max(new Date(inc.startedAt).getTime(), now - windowMs);
      const e = inc.resolvedAt ? Math.min(new Date(inc.resolvedAt).getTime(), now) : now;
      if (e > s) downtimeMs += e - s;
    });
    const pct = Math.max(0, 100 - (downtimeMs / windowMs) * 100);
    return { pct: pct.toFixed(2) + "%", count: countInWindow, downtimeMs };
  };
  return { d7: calc(7 * 86400000), d30: calc(30 * 86400000), d365: calc(365 * 86400000) };
}

function fmtDowntime(ms: number): string {
  if (ms <= 0) return "0m";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/* ─── Chart tooltip ──────────────────────────────────────── */
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{d.time}</div>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${d.success ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-white font-semibold">{formatMs(d.responseTimeMs)}</span>
      </div>
      {d.errorType && <div className="text-red-400 mt-1">{d.errorType}</div>}
    </div>
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={3.5} fill={payload.success ? "#4ade80" : "#f87171"} stroke={payload.success ? "#14532d" : "#7f1d1d"} strokeWidth={1.5} />;
}

function CustomActiveDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={5} fill={payload.success ? "#4ade80" : "#f87171"} stroke="#0f1117" strokeWidth={2} />;
}

/* ─── Uptime bar ─────────────────────────────────────────── */
function UptimeBar({ incidents }: { incidents: any[] }) {
  const SLOTS = 90;
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const slotMs = windowMs / SLOTS;

  const slots = Array.from({ length: SLOTS }, (_, i) => {
    const slotStart = now - windowMs + i * slotMs;
    const slotEnd = slotStart + slotMs;
    const overlapping = incidents.filter((inc) => {
      const incStart = new Date(inc.startedAt).getTime();
      const incEnd = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : now;
      return incStart < slotEnd && incEnd > slotStart;
    });
    if (overlapping.length === 0) return "up";
    return overlapping.some((inc) => !inc.resolvedAt) ? "ongoing" : "resolved";
  });

  const label = (s: string) => {
    if (s === "up") return "bg-green-500";
    if (s === "resolved") return "bg-amber-500";
    return "bg-red-500";
  };

  const slotTooltip = (i: number, s: string) => {
    const slotStart = new Date(now - windowMs + i * slotMs);
    const slotEnd = new Date(now - windowMs + (i + 1) * slotMs);
    const fmt = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const stateLabel = s === "up" ? "Up" : s === "resolved" ? "Had incident (resolved)" : "Down";
    return fmt(slotStart) + " – " + fmt(slotEnd) + ": " + stateLabel;
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-[1.5px] items-center">
        {slots.map((s, i) => (
          <div key={i} title={slotTooltip(i, s)} className={"h-[18px] rounded-[2px] flex-1 transition-opacity hover:opacity-70 " + label(s)} />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-green-500" />Up</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-amber-500" />Resolved incident</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-500" />Ongoing</span>
      </div>
    </div>
  );
}

/* ─── Paginated run table ────────────────────────────────── */
function RunTable({ runs }: { runs: any[] }) {
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE));
  const paginated = runs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[44px_100px_1fr_72px_150px] px-4 py-2.5 bg-slate-800/70 text-[10px] uppercase tracking-widest text-slate-500">
          <div className="text-center">OK</div>
          <div>Response</div>
          <div>Error</div>
          <div>HTTP</div>
          <div>When</div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {paginated.map((r: any) => (
            <div key={r.id} className="grid grid-cols-[44px_100px_1fr_72px_150px] px-4 py-3 items-center text-sm hover:bg-slate-800/30 transition-colors">
              <div className="flex justify-center">
                {r.success
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>
              <div className="tabular-nums text-white font-medium">{formatMs(r.responseTimeMs)}</div>
              <div className="text-slate-400 break-all text-xs pr-1 min-w-0" title={r.errorType ?? ""}>{r.errorType ?? "–"}</div>
              <div className="text-slate-400 tabular-nums text-xs">{r.httpStatus ?? "–"}</div>
              <div className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-500">
            Showing <span className="text-white font-medium">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, runs.length)}</span> of <span className="text-white font-medium">{runs.length}</span> runs
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === "…"
                ? <span key={`e-${i}`} className="px-1 text-slate-600 text-xs">…</span>
                : <button key={p} onClick={() => setPage(p as number)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${page === p ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>{p}</button>
              )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TIME_RANGES = [
  { label: "Last hour", ms: 60 * 60 * 1000 },
  { label: "Last 6h", ms: 6 * 60 * 60 * 1000 },
  { label: "Last 24h", ms: 24 * 60 * 60 * 1000 },
  { label: "All", ms: 0 },
];

/* ─── MAIN ───────────────────────────────────────────────── */
export function JobDetails({ job, runs, status, incidents, viewMode, onEdit, onToggle, onJobUpdated }: any) {
  const [timeRange, setTimeRange] = useState(TIME_RANGES[0]);
  const [alertsBusy, setAlertsBusy] = useState(false);

  // ✅ Local optimistic state — initialised from prop, updated instantly on click
  // Falls back to true for older DB records that predate the column
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(job.alertsEnabled !== false);

  // Keep local state in sync if the parent pushes a refreshed job object
  // (e.g. after the 5-second polling cycle re-runs loadJobs)
  const prevJobId = job.id;

  const lastRun = runs?.[0];
  const ongoingIncidents = incidents?.filter((i: any) => !i.resolvedAt) ?? [];
  const isDown = ongoingIncidents.length > 0;

  async function handleToggleAlerts() {
    const next = !alertsEnabled;

    // ✅ Flip the UI immediately — no waiting for server or parent refresh
    setAlertsEnabled(next);
    setAlertsBusy(true);

    try {
      await toggleJobAlerts(job.id, next);
      // Sync parent list in background so the JobList badge also updates
      onJobUpdated?.();
    } catch (err) {
      // Revert on failure
      setAlertsEnabled(!next);
      console.error(err);
    } finally {
      setAlertsBusy(false);
    }
  }

  const stats = useMemo(() => {
    const total = runs?.length ?? 0;
    const success = runs?.filter((r: any) => r.success).length ?? 0;
    const times = (runs ?? []).map((r: any) => r.responseTimeMs).filter((t: any) => t != null) as number[];
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    let downtimeMs24 = 0;
    (incidents ?? []).forEach((inc: any) => {
      const s = Math.max(new Date(inc.startedAt).getTime(), now - windowMs);
      const e = inc.resolvedAt ? Math.min(new Date(inc.resolvedAt).getTime(), now) : now;
      if (e > s) downtimeMs24 += e - s;
    });
    const uptime24 = incidents?.length
      ? Math.max(0, 100 - (downtimeMs24 / windowMs) * 100).toFixed(1) + "%"
      : total > 0 ? "100.0%" : "–";
    return {
      total, success, failed: total - success,
      uptime24,
      avg: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      min: times.length ? Math.min(...times) : null,
      max: times.length ? Math.max(...times) : null,
    };
  }, [runs, incidents]);

  const windows = useMemo(() => uptimeWindows(incidents ?? []), [incidents]);

  const chartData = useMemo(() => {
    const now = Date.now();
    const filtered = timeRange.ms === 0 ? runs ?? []
      : (runs ?? []).filter((r: any) => new Date(r.createdAt).getTime() >= now - timeRange.ms);
    return [...filtered].reverse().map((r: any) => ({
      time: new Date(r.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      responseTimeMs: r.responseTimeMs ?? null,
      success: r.success,
      errorType: r.errorType,
    }));
  }, [runs, timeRange]);

  return (
    <div className="flex flex-col min-h-full ">

      {/* breadcrumb */}
      <div className="px-7 pt-5 pb-1">
        <span className="text-xs text-slate-500">Monitoring</span>
        <span className="text-xs text-slate-600 mx-1.5">›</span>
        <span className="text-xs text-slate-400 truncate">{job.prompt.slice(0, 50)}</span>
      </div>

      {/* header */}
      <div className="flex items-start justify-between px-7 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            !job.isActive ? "bg-slate-600"
            : isDown ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
            : "bg-green-500 shadow-[0_0_12px_rgba(74,222,128,0.4)]"
          }`}>
            <div className="w-2.5 h-2.5 rounded-full bg-white/70" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white leading-tight">{job.prompt.slice(0, 60)}</h1>
              {!alertsEnabled && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <BellOff className="w-2.5 h-2.5" />
                  Alerts muted
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wide">{job.model ?? "AI"}</span>
              <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />every {job.intervalSeconds}s</span>
              {lastRun && <span className="text-xs text-slate-500">Last run: {timeAgo(lastRun.createdAt)}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* ── Alert toggle button ── */}
          <button
            onClick={handleToggleAlerts}
            disabled={alertsBusy}
            title={alertsEnabled ? "Mute alerts for this scheduler" : "Unmute alerts for this scheduler"}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
              alertsEnabled
                ? "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                : "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
            }`}
          >
            {alertsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {alertsEnabled ? "Alerts on" : "Alerts off"}
          </button>

          <button
            onClick={() => onToggle?.(job)}
            className="flex items-center gap-1.5 text-xs text-slate-300 border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pause className="w-3 h-3" />{job.isActive ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => onEdit?.(job)}
            className="flex items-center gap-1.5 text-xs text-slate-300 border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil className="w-3 h-3" />Edit
          </button>
          {/* <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button> */}
        </div>
      </div>

      {/* top 4 stat cards */}
      <div className="grid grid-cols-4 border-b border-slate-800">
        <div className="px-6 py-5 border-r border-slate-800">
          <div className="text-xs text-slate-500 mb-2 font-medium">Current status</div>
          <div className={`text-xl font-bold ${!job.isActive ? "text-slate-400" : isDown ? "text-red-400" : "text-green-400"}`}>
            {!job.isActive ? "Paused" : isDown ? "Down" : "Up"}
          </div>
          {lastRun && <div className="text-xs text-slate-500 mt-1">{isDown ? `Down for ${timeAgo(ongoingIncidents[0]?.startedAt)}` : `Up for ${timeAgo(lastRun.createdAt)}`}</div>}
        </div>
        <div className="px-6 py-5 border-r border-slate-800">
          <div className="text-xs text-slate-500 mb-2 font-medium">Last check</div>
          <div className="text-xl font-bold text-white">{lastRun ? timeAgo(lastRun.createdAt) : "–"}</div>
          <div className="text-xs text-slate-500 mt-1">Checked every {job.intervalSeconds}s</div>
        </div>
        <div className="px-6 py-5 border-r border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium">Last 24 hours</span>
            <span className="text-xs font-bold text-white">{stats.uptime24}</span>
          </div>
          <UptimeBar incidents={incidents ?? []} />
          {(() => {
            const now = Date.now();
            const w = 86400000;
            const recent24 = (incidents ?? []).filter((i: any) => {
              const start = new Date(i.startedAt).getTime();
              const end = i.resolvedAt ? new Date(i.resolvedAt).getTime() : now;
              return start < now && end > now - w;
            });
            let d = 0;
            recent24.forEach((i: any) => {
              const s = Math.max(new Date(i.startedAt).getTime(), now - w);
              const e = i.resolvedAt ? Math.min(new Date(i.resolvedAt).getTime(), now) : now;
              if (e > s) d += e - s;
            });
            return (
              <div className="text-xs text-slate-500 mt-1.5">
                {recent24.length} incident{recent24.length !== 1 ? "s" : ""}, {fmtDowntime(d)} down
              </div>
            );
          })()}
        </div>
        <div className="px-6 py-5">
          <div className="text-xs text-slate-500 mb-2 font-medium">Avg response</div>
          <div className="text-xl font-bold text-white">{formatMs(stats.avg)}</div>
          <div className="text-xs text-slate-500 mt-1">over {stats.total} runs</div>
        </div>
      </div>

      {/* uptime windows */}
      <div className="grid grid-cols-3 border-b border-slate-800">
        {[{ label: "Last 7 days", w: windows.d7 }, { label: "Last 30 days", w: windows.d30 }, { label: "Last 365 days", w: windows.d365 }]
          .map(({ label, w }, idx) => (
            <div key={label} className={`px-6 py-5 ${idx < 2 ? "border-r border-slate-800" : ""}`}>
              <div className="text-xs text-slate-500 mb-1 font-medium">{label}</div>
              <div className={`text-2xl font-bold ${w.pct === "–" ? "text-slate-500" : Number(w.pct.replace("%","")) >= 99 ? "text-green-400" : Number(w.pct.replace("%","")) >= 90 ? "text-yellow-400" : "text-red-400"}`}>{w.pct}</div>
              <div className="text-xs text-slate-600 mt-1">{w.count} incident{w.count !== 1 ? "s" : ""}, {fmtDowntime(w.downtimeMs)} down</div>
            </div>
          ))}
      </div>

      {/* response time chart */}
      <div className="px-7 py-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div className="text-sm font-semibold text-white">Response time<span className="text-slate-500">.</span></div>
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
            {TIME_RANGES.map((r) => (
              <button key={r.label} onClick={() => setTimeRange(r)} className={`text-xs px-2.5 py-1 rounded-md transition-colors ${timeRange.label === r.label ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {chartData.filter((d) => d.responseTimeMs != null).length < 2 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-600">Not enough data for this time range</div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2433" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}ms`} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="responseTimeMs" stroke="#4ade80" strokeWidth={2} dot={<CustomDot />} activeDot={<CustomActiveDot />} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex items-center gap-10 mt-5 pt-4 border-t border-slate-800">
          {[{ label: "Average", value: stats.avg, sym: "~" }, { label: "Minimum", value: stats.min, sym: "↓" }, { label: "Maximum", value: stats.max, sym: "↑" }]
            .map(({ label, value, sym }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-slate-500 text-base font-mono leading-none">{sym}</span>
                <div>
                  <div className="text-base font-bold text-white">{formatMs(value)}</div>
                  <div className="text-xs text-slate-500">{label}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* latest incidents */}
      <div className="px-7 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm font-semibold text-white">Latest incidents<span className="text-slate-500">.</span></div>
          {incidents?.length > 0 && (
            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{incidents.length}</span>
          )}
        </div>
        <PaginatedIncidentTable incidents={incidents ?? []} pageSize={8} />
      </div>

      {/* run history */}
      <div className="px-7 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-semibold text-white">Run History<span className="text-slate-500">.</span></span>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full ml-1">{runs?.length ?? 0}</span>
        </div>
        <RunTable runs={viewMode === "ERRORS" ? (runs ?? []).filter((r: any) => !r.success) : (runs ?? [])} />
      </div>
    </div>
  );
}