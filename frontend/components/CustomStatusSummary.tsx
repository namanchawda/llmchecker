"use client";

import { useMemo } from "react";
import { Server } from "lucide-react";

export function CustomStatusSummary({
  incidents,
  jobs = [],
}: {
  incidents: any[];
  jobs?: any[];
}) {
  const stats = useMemo(() => {
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;

    const activeJobs = jobs.filter((j) => j.isActive);
    const paused = jobs.filter((j) => !j.isActive).length;
    const active = activeJobs.length;
    const activeJobIds = new Set(activeJobs.map((j: any) => j.id));

    // ── Down / Up ──────────────────────────────────────────────────────────
    // A job is "down" only if it's ACTIVE and has an unresolved incident.
    // Paused jobs are never "down" — they're just paused.
    const ongoingIncidents = (incidents ?? []).filter(
      (i) => !i.resolvedAt && activeJobIds.has(i.jobId)
    );
    const downCount = new Set(ongoingIncidents.map((i: any) => i.jobId)).size; // unique jobs down
    const upCount = Math.max(0, active - downCount);

    // ── Overall uptime (last 24h) ──────────────────────────────────────────
    // Only count downtime for active jobs, divided by (active monitors × 24h).
    // If no active monitors → null (show "–" not "100%").
    let totalDowntimeMs = 0;
    (incidents ?? []).forEach((inc) => {
      if (!activeJobIds.has(inc.jobId)) return; // ignore paused jobs
      const start = Math.max(new Date(inc.startedAt).getTime(), now - windowMs);
      const end = inc.resolvedAt
        ? Math.min(new Date(inc.resolvedAt).getTime(), now)
        : now;
      if (end > start) totalDowntimeMs += end - start;
    });

    const uptimePct =
      active === 0
        ? null // no active monitors — don't show a misleading 100%
        : Math.max(0, 100 - (totalDowntimeMs / (active * windowMs)) * 100);

    // ── Recent incidents (within 24h window) ──────────────────────────────
    const recentIncidents = (incidents ?? []).filter(
      (i) => new Date(i.startedAt).getTime() >= now - windowMs
    );

    // "Time without incident" = mins since most recent incident activity
    const lastActivity = recentIncidents.reduce((latest, i) => {
      const t = i.resolvedAt
        ? new Date(i.resolvedAt).getTime()
        : new Date(i.startedAt).getTime();
      return t > latest ? t : latest;
    }, 0);

    const minsWithoutIncident = lastActivity
      ? Math.floor((now - lastActivity) / 60000)
      : null;

    const affectedIds = new Set(
      recentIncidents.map((i: any) => i.jobId).filter(Boolean)
    );

    return {
      downCount,
      upCount,
      paused,
      active,
      total: jobs.length,
      uptimePct: uptimePct === null ? null : uptimePct.toFixed(1),
      recentIncidentCount: recentIncidents.length,
      affectedMonitors: affectedIds.size,
      minsWithoutIncident,
    };
  }, [incidents, jobs]);

  // Status orb: only based on ACTIVE monitors
  const overallStatus =
    stats.downCount > 1
      ? { color: "bg-red-500", glow: "shadow-[0_0_12px_rgba(239,68,68,0.5)]" }
      : stats.downCount === 1
      ? { color: "bg-orange-500", glow: "shadow-[0_0_12px_rgba(249,115,22,0.5)]" }
      : stats.active === 0
      ? { color: "bg-slate-500", glow: "" } // all paused → grey
      : { color: "bg-green-500", glow: "shadow-[0_0_12px_rgba(74,222,128,0.5)]" };

  // Format "Xm" or "Xh Xm"
  function fmtMins(m: number | null) {
    if (m === null) return "–";
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Current Status Card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="text-sm font-semibold text-white mb-3">
          Current status<span className="text-slate-500">.</span>
        </div>

        <div className="flex justify-center mb-4">
          <div
            className={`w-12 h-12 rounded-full ${overallStatus.color} ${overallStatus.glow} flex items-center justify-center`}
          >
            <Server className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-red-400">{stats.downCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Down</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{stats.upCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Up</div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-400">{stats.paused}</div>
            <div className="text-xs text-slate-500 mt-0.5">Paused</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500 text-center">
          Using {stats.active} of {stats.total} monitors.
        </div>
      </div>

      {/* Last 24 Hours Card */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-white">
            Last 24 hours<span className="text-slate-500">.</span>
          </div>
          <span className="text-slate-600 text-xs">···</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div
              className={`text-xl font-bold ${
                stats.uptimePct === null
                  ? "text-slate-500"
                  : Number(stats.uptimePct) >= 99
                  ? "text-green-400"
                  : Number(stats.uptimePct) >= 90
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {stats.uptimePct === null ? "–" : `${stats.uptimePct}%`}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Overall uptime</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {stats.recentIncidentCount}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Incidents</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {fmtMins(stats.minsWithoutIncident)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Without incid.</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {stats.affectedMonitors}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Affected mon.</div>
          </div>
        </div>
      </div>
    </div>
  );
}