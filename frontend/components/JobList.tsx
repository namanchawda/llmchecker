"use client";

import { useState, useRef, useEffect } from "react";
import { deleteJob } from "../lib/api";
import { enableJob, disableJob, toggleJobAlerts } from "../app/api/monitor";
import { Eye, Clock, MoreHorizontal, Pencil, Trash2, Power, Bell, BellOff } from "lucide-react";

type Job = {
  id: string;
  prompt: string;
  isActive: boolean;
  alertsEnabled: boolean;
  intervalSeconds: number;
  model?: string;
  encryptedApiKey?: string;
};

type Props = {
  jobs: Job[];
  selectedId: string | null;
  onSelect: (jobId: string) => void;
  onShowErrors: (jobId: string) => void;
  onJobUpdated?: () => void;
  onEdit?: (job: Job) => void;
  onDeleted?: (jobId: string) => void;
  allIncidents?: Record<string, any[]>;
};

/* Mini uptime sparkline — 30 slots × 48 min = 24 hours */
function UptimeBar({ jobId, isActive, incidents = [] }: { jobId: string; isActive: boolean; incidents?: any[] }) {
  const BARS = 30;
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const slotMs = windowMs / BARS;

  const bars = Array.from({ length: BARS }, (_, i) => {
    const slotStart = now - windowMs + i * slotMs;
    const slotEnd = slotStart + slotMs;
    const overlapping = incidents.filter((inc) => {
      const s = new Date(inc.startedAt).getTime();
      const e = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : now;
      return s < slotEnd && e > slotStart;
    });
    if (overlapping.length === 0) return "up";
    return overlapping.some((inc) => !inc.resolvedAt) ? "ongoing" : "resolved";
  });

  const upSlots = bars.filter((b) => b === "up").length;
  const pctUp = isActive ? ((upSlots / BARS) * 100).toFixed(0) : "–";

  const barColor = (state: string) => {
    if (!isActive) return "bg-slate-600";
    if (state === "up") return "bg-green-500";
    if (state === "resolved") return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-[2px] items-end">
        {bars.map((state, i) => (
          <div
            key={i}
            title={state === "up" ? "Up" : state === "resolved" ? "Had incident (resolved)" : "Currently down"}
            className={"w-[3px] rounded-sm h-4 transition-all " + barColor(state)}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">
        {isActive ? `${pctUp}%` : "–"}
      </span>
    </div>
  );
}

/* ··· dropdown menu */
function JobMenu({
  job,
  onEdit,
  onDeleted,
  onToggle,
  onToggleAlerts,
  busy,
}: {
  job: Job;
  onEdit: () => void;
  onDeleted: (id: string) => void;
  onToggle: () => void;
  onToggleAlerts: () => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed z-[9999] w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            onClick={() => { onToggle(); setOpen(false); }}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            {job.isActive ? "Pause" : "Resume"}
          </button>
          <button
            onClick={() => { onToggleAlerts(); setOpen(false); }}
            disabled={busy}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {job.alertsEnabled
              ? <BellOff className="w-3.5 h-3.5 text-amber-400" />
              : <Bell className="w-3.5 h-3.5 text-green-400" />}
            {job.alertsEnabled ? "Mute alerts" : "Unmute alerts"}
          </button>
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <div className="my-1 border-t border-slate-700" />
          <button
            onClick={async () => {
              if (!confirm("Delete this scheduler?")) return;
              await deleteJob(job.id);
              onDeleted(job.id);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function JobList({
  jobs,
  selectedId,
  onSelect,
  onShowErrors,
  onJobUpdated,
  onEdit,
  onDeleted,
  allIncidents = {},
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(job: Job) {
    setLoadingId(job.id);
    try {
      job.isActive ? await disableJob(job.id) : await enableJob(job.id);
      onJobUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleAlerts(job: Job) {
    setLoadingId(job.id);
    try {
      await toggleJobAlerts(job.id, !job.alertsEnabled);
      onJobUpdated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  }

  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-slate-500" />
        </div>
        <div className="text-sm text-slate-400 font-medium">No schedulers yet</div>
        <div className="text-xs text-slate-600 mt-1">Create one to start monitoring</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-slate-800/60">
      {jobs.map((job) => {
        const isSelected = job.id === selectedId;
        const busy = loadingId === job.id;
        const jobIncidents = allIncidents[job.id] ?? [];
        const hasActiveIncident = jobIncidents.some((i: any) => !i.resolvedAt);
        // alertsEnabled defaults to true if missing (older records before migration)
        const alertsEnabled = job.alertsEnabled !== false;

        return (
          <div
            key={job.id}
            onClick={() => onSelect(job.id)}
            className={`flex items-center gap-4 px-4 py-4 cursor-pointer transition-colors group ${
              isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/30"
            }`}
          >
            {/* Status dot */}
            <div className="shrink-0">
              <div className={`w-3 h-3 rounded-full ${
                !job.isActive ? "bg-slate-500"
                : hasActiveIncident ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                : "bg-green-500 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
              }`} />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {job.prompt.slice(0, 60)}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  {job.model?.split("-").slice(0, 2).join("-") ?? "AI"}
                </span>
                <span className="text-xs text-slate-500">
                  {!job.isActive ? "Paused" : hasActiveIncident ? "Incident detected" : "Running"}
                </span>
              </div>
            </div>

            {/* View incident button */}
            {hasActiveIncident && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowErrors(job.id); }}
                className="flex items-center gap-1.5 text-xs text-orange-400 border border-orange-400/30 bg-orange-400/10 hover:bg-orange-400/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                <Eye className="w-3 h-3" />
                View incident
              </button>
            )}

            {/* Interval badge */}
            <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
              <Clock className="w-3 h-3" />
              <span>{job.intervalSeconds}s</span>
            </div>

            {/* Alerts muted badge — visible indicator when alerts are off */}
            {!alertsEnabled && (
              <div
                title="Alerts muted for this scheduler"
                className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg shrink-0"
              >
                <BellOff className="w-3 h-3" />
                <span>Muted</span>
              </div>
            )}

            {/* Uptime sparkline */}
            <div className="shrink-0">
              <UptimeBar jobId={job.id} isActive={job.isActive} incidents={jobIncidents} />
            </div>

            {/* ··· menu */}
            <JobMenu
              job={job}
              onEdit={() => onEdit?.(job)}
              onDeleted={(id) => onDeleted?.(id)}
              onToggle={() => handleToggle(job)}
              onToggleAlerts={() => handleToggleAlerts(job)}
              busy={busy}
            />
          </div>
        );
      })}
    </div>
  );
}