"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink, Clock, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { ServiceStatus } from "../lib/types";
import { StatusBadge } from "./StatusBadge";
import { LivePerformanceRun } from "../lib/performance-types";

const INCIDENTS_PER_PAGE = 5;

function statusDot(status: string) {
  switch (status) {
    case "operational":
      return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]";
    case "degraded_performance":
    case "partial_outage":
      return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]";
    case "major_outage":
    case "critical":
      return "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]";
    default:
      return "bg-slate-500";
  }
}

function incidentStatusBadge(status: string) {
  switch (status) {
    case "resolved":
      return "border-emerald-400/50 text-emerald-300 bg-emerald-500/10";
    case "monitoring":
      return "border-sky-400/50 text-sky-300 bg-sky-500/10";
    case "investigating":
      return "border-red-500/50 text-red-400 bg-red-500/10";
    case "identified":
      return "border-amber-400/50 text-amber-300 bg-amber-500/10";
    default:
      return "border-slate-400/40 text-slate-300 bg-white/5";
  }
}

function impactBadge(impact?: string) {
  switch (impact) {
    case "critical": return "border-red-500/50 text-red-400 bg-red-500/10";
    case "major":    return "border-orange-400/50 text-orange-300 bg-orange-500/10";
    case "minor":    return "border-yellow-400/50 text-yellow-300 bg-yellow-400/10";
    default:         return "border-slate-400/40 text-slate-300 bg-white/5";
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  service: ServiceStatus | null;
  run?: LivePerformanceRun;
  onClose: () => void;
}

export function ServiceDetailPanel({ service, run, onClose }: Props) {
  const [incidentPage, setIncidentPage] = useState(1);

  if (!service) return null;

  // All incidents = live (from incidents[]) + historical (from recentIncidents[])
  // Deduplicate by id
  const allIncidents = [
    ...(service.incidents ?? []),
    ...(service.recentIncidents ?? []).filter(
      (r: any) => !service.incidents?.some((i: any) => i.id === r.id)
    ),
  ].sort((a: any, b: any) =>
    new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(allIncidents.length / INCIDENTS_PER_PAGE));
  const pagedIncidents = allIncidents.slice(
    (incidentPage - 1) * INCIDENTS_PER_PAGE,
    incidentPage * INCIDENTS_PER_PAGE
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[560px] z-50 flex flex-col bg-[#0d0f16] border-l border-white/10 shadow-[−20px_0_60px_rgba(0,0,0,0.6)] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shrink-0 ${statusDot(service.status)}`} />
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">{service.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{service.provider}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Stat row ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Status</div>
              <StatusBadge status={service.status} />
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Latency</div>
              <div className={`text-base font-bold font-mono ${run?.success ? (run.latencyMs < 800 ? "text-emerald-400" : run.latencyMs < 1500 ? "text-amber-400" : "text-red-400") : "text-slate-500"}`}>
                {run?.success ? `${run.latencyMs} ms` : "—"}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Incidents</div>
              <div className={`text-base font-bold ${allIncidents.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {allIncidents.length}
              </div>
            </div>
          </div>

          {/* ── Live execution health ── */}
          {run && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Live execution</span>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${run.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                {run.success
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${run.success ? "text-emerald-300" : "text-red-300"}`}>
                    {run.success ? "API responding normally" : "API call failed"}
                  </div>
                  {!run.success && run.errorType && <div className="text-xs text-slate-500 mt-0.5 truncate">{run.errorType}</div>}
                </div>
                <div className="text-xs font-mono text-slate-400 shrink-0">{run.latencyMs}ms</div>
              </div>
            </div>
          )}

          {/* ── Component drilldown ── */}
          {service.components && service.components.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3.5 h-3.5 grid grid-cols-2 gap-[2px] shrink-0">
                  {[0,1,2,3].map(i => <div key={i} className="rounded-[1px] bg-slate-400" />)}
                </div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                  Components ({service.components.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {service.components.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(c.status)}`} />
                      <div className="min-w-0">
                        <div className="text-sm text-slate-200 truncate">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-slate-500 truncate">{c.description}</div>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent incidents ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                Recent incidents
              </span>
              {allIncidents.length > 0 && (
                <span className="ml-auto text-[10px] text-slate-500">
                  {allIncidents.length} total
                </span>
              )}
            </div>

            {allIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <CheckCircle className="w-8 h-8 text-emerald-500/50 mb-2" />
                <div className="text-sm text-slate-500">No recent incidents</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {pagedIncidents.map((incident: any, idx: number) => (
                    <div
                      key={incident.id ?? idx}
                      className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${incidentStatusBadge(incident.status)}`}>
                            {incident.status?.toUpperCase()}
                          </span>
                          {incident.impact && (
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${impactBadge(incident.impact)}`}>
                              {incident.impact.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {incident.startedAt && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                            <Clock className="w-3 h-3" />
                            {timeAgo(incident.startedAt)}
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div className="text-sm text-slate-200 leading-snug mb-1">{incident.name}</div>

                      {/* Date */}
                      {incident.startedAt && (
                        <div className="text-[11px] text-slate-600">
                          {new Date(incident.startedAt).toLocaleString()}
                        </div>
                      )}

                      {/* Link */}
                      {incident.link && (
                        <a
                          href={incident.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          View details <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-slate-500">
                      Page {incidentPage} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setIncidentPage(p => Math.max(1, p - 1))}
                        disabled={incidentPage === 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          onClick={() => setIncidentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            p === incidentPage
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "text-slate-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setIncidentPage(p => Math.min(totalPages, p + 1))}
                        disabled={incidentPage === totalPages}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Last checked ── */}
          {service.lastChecked && (
            <div className="text-[11px] text-slate-600 text-center pb-2">
              Last checked {new Date(service.lastChecked).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}