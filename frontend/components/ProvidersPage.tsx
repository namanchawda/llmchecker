"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { ServiceStatus } from "../lib/types";
import type { ApiCurrentSnapshot } from "../lib/api-types";
import type { LivePerformanceRun } from "../lib/performance-types";
import {
  ArrowLeft, Clock, AlertTriangle, CheckCircle2,
  ExternalLink, ChevronRight, Server, Globe, Radio, Zap,
  Bell, BellOff, BellRing, Settings,
} from "lucide-react";
import {
  getProviderAlertSubscriptions,
  setProviderAlert,
  getIntegrations,
  type ProviderAlertSubscription,
} from "../lib/api";

/* ─── Real SVG logos ────────────────────────────────────────── */

function OpenAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function AnthropicLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#e8816a">
      <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.327-3.208h6.57l1.326 3.208h3.603L10.173 3.52zm-4.017 10.56l2.015-5.24 2.015 5.24H6.156z" />
    </svg>
  );
}

function GeminiLogo({ size = 20 }: { size?: number }) {
  const id = `gem-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4285F4" />
          <stop offset="50%"  stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

function XAILogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ProviderLogo({ id, size = 20 }: { id: string; size?: number }) {
  switch (id) {
    case "openai":    return <OpenAILogo size={size} />;
    case "anthropic": return <AnthropicLogo size={size} />;
    case "gemini":    return <GeminiLogo size={size} />;
    case "grok":      return <XAILogo size={size} />;
    default:          return <span style={{ fontSize: size * 0.75, lineHeight: 1 }}>◆</span>;
  }
}

const LOGO_BG: Record<string, string> = {
  openai:    "bg-[#10a37f]/10 border-[#10a37f]/20",
  anthropic: "bg-[#e8816a]/10 border-[#e8816a]/20",
  gemini:    "bg-[#4285F4]/10 border-[#4285F4]/20",
  grok:      "bg-white/5    border-white/10",
};

/* ─── Alert toggle button ───────────────────────────────────── */

function AlertToggleButton({
  alertsEnabled,
  hasIntegrations,
  loading,
  saving,
  onToggle,
  onGoToIntegrations,
}: {
  alertsEnabled: boolean;
  hasIntegrations: boolean;
  loading: boolean;
  saving: boolean;
  onToggle: () => void;
  onGoToIntegrations: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 border border-white/10 bg-white/[0.03] px-3 py-1.5 rounded-lg">
        <span className="w-3 h-3 rounded-full border border-slate-500 border-t-transparent animate-spin" />
        Loading…
      </div>
    );
  }

  if (!hasIntegrations) {
    return (
      <button
        onClick={onGoToIntegrations}
        className="flex items-center gap-1.5 text-xs text-amber-300 border border-amber-400/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] hover:border-amber-400/50 px-3 py-1.5 rounded-lg transition"
      >
        <Settings className="w-3 h-3" />
        Set up integrations first
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      disabled={saving}
      className={`
        flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition
        disabled:opacity-50 disabled:cursor-not-allowed
        ${alertsEnabled
          ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12] hover:border-emerald-400/50"
          : "text-slate-400 border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"}
      `}
    >
      {saving ? (
        <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
      ) : alertsEnabled ? (
        <BellRing className="w-3 h-3" />
      ) : (
        <BellOff className="w-3 h-3" />
      )}
      {alertsEnabled ? "Alerts On" : "Alerts Off"}
    </button>
  );
}

/* ─── helpers ───────────────────────────────────────────────── */

function impactBadge(impact: string | undefined) {
  if (!impact || impact === "–") return <span className="text-xs text-slate-600">–</span>;
  const cls =
    impact === "critical" ? "badge--alert" :
    impact === "major"    ? "badge--warn"  :
    impact === "minor"    ? "text-sky-300 border-sky-400/40 bg-sky-500/10" :
    "badge--neutral";
  return (
    <span className={`badge text-[10px] capitalize ${cls}`}>{impact}</span>
  );
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function statusTextColor(s: string) {
  if (s === "operational") return "text-emerald-400";
  if (["degraded", "degraded_performance", "partial_outage"].includes(s)) return "text-amber-300";
  if (["outage", "major_outage"].includes(s)) return "text-red-300";
  return "text-slate-400";
}

function statusDot(s: string) {
  if (s === "operational") return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.6)]";
  if (["degraded", "degraded_performance", "partial_outage"].includes(s))
    return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.6)]";
  if (["outage", "major_outage"].includes(s))
    return "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,.6)]";
  return "bg-slate-500";
}

function latencyColor(ms: number) {
  if (ms < 800)  return "text-emerald-400";
  if (ms < 1500) return "text-amber-300";
  return "text-red-300";
}

/* ─── Sidebar list item ─────────────────────────────────────── */

function SidebarItem({
  service, selected, onSelect, perfRun, alertsEnabled, isLoggedIn,
}: {
  service: ServiceStatus;
  selected: boolean;
  onSelect: () => void;
  perfRun?: LivePerformanceRun;
  alertsEnabled?: boolean;
  isLoggedIn: boolean;
}) {
  const active = service.incidents?.filter(i => i.status !== "resolved") ?? [];
  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left px-4 py-3 transition-all
        border-b border-white/[0.06]
        flex items-center gap-3 group
        border-l-2
        ${selected
          ? "bg-white/[0.06] border-l-emerald-400/70"
          : "border-l-transparent hover:bg-white/[0.03]"}
      `}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${LOGO_BG[service.id] ?? "bg-white/5 border-white/10"}`}>
        <ProviderLogo id={service.id} size={14} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-200 truncate">{service.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            {active.length > 0 && (
              <span className="badge badge--alert text-[10px] px-1.5 py-0">{active.length} active</span>
            )}
            {isLoggedIn && alertsEnabled && (
              <Bell className="w-3 h-3 text-emerald-400/60" />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot(service.status)}`} />
            <span className={`capitalize ${statusTextColor(service.status)}`}>
              {(service.status as string).replace(/_/g, " ")}
            </span>
          </span>
          {perfRun?.success && (
            <span className={`text-[10px] font-mono font-semibold shrink-0 ml-2 ${latencyColor(perfRun.latencyMs)}`}>
              {perfRun.latencyMs} ms
            </span>
          )}
        </div>
      </div>

      <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all ${selected ? "text-emerald-400" : "text-white/20 group-hover:text-white/40"}`} />
    </button>
  );
}

/* ─── Provider detail ───────────────────────────────────────── */

function ProviderDetail({
  service, onBack, perfRun,
  isLoggedIn, alertsEnabled, hasIntegrations, alertLoading, alertSaving,
  onToggleAlert, onGoToIntegrations,
}: {
  service: ServiceStatus;
  onBack: () => void;
  perfRun?: LivePerformanceRun;
  isLoggedIn: boolean;
  alertsEnabled: boolean;
  hasIntegrations: boolean;
  alertLoading: boolean;
  alertSaving: boolean;
  onToggleAlert: () => void;
  onGoToIntegrations: () => void;
}) {
  const active   = service.incidents?.filter(i => i.status !== "resolved") ?? [];
  const recent   = (service.recentIncidents ?? []).slice(0, 10);
  const logoBg   = LOGO_BG[service.id] ?? "bg-white/5 border-white/10";

  return (
    <div className="flex flex-col min-h-full">

      {/* breadcrumb */}
      <div className="px-7 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Providers
        </button>
        <span className="text-white/20 text-xs">›</span>
        <span className="text-xs text-slate-400">{service.name}</span>
      </div>

      {/* ── header ── */}
      <div className="mx-7 mb-0">
        <div className="flex items-start justify-between px-5 py-4 rounded-t-2xl border border-white/10 border-b-0 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${logoBg}`}>
              <ProviderLogo id={service.id} size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-200">{service.name}</h1>
                <span className={active.length ? "badge badge--alert text-[10px]" : "badge badge--success text-[10px]"}>
                  {active.length ? "● Incident Active" : "● Operational"}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500 flex items-center gap-1"><Globe className="w-3 h-3" />{service.provider}</span>
                {service.lastChecked && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Checked {timeAgo(service.lastChecked)}</span>
                )}
              </div>
            </div>
          </div>

          {/* right-side actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {isLoggedIn && (
              <AlertToggleButton
                alertsEnabled={alertsEnabled}
                hasIntegrations={hasIntegrations}
                loading={alertLoading}
                saving={alertSaving}
                onToggle={onToggleAlert}
                onGoToIntegrations={onGoToIntegrations}
              />
            )}
            <a href={`https://${service.provider}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 px-3 py-1.5 rounded-lg transition">
              <ExternalLink className="w-3 h-3" />Status page
            </a>
          </div>
        </div>
      </div>

      {/* ── 3 stat cards ── */}
      <div className="mx-7 mb-5">
        <div className="grid grid-cols-3 border border-white/10 border-t-0 rounded-b-2xl overflow-hidden">
          {/* Status */}
          <div className="px-5 py-4 border-r border-white/[0.07] bg-white/[0.01]">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-medium">Status</p>
            <p className={`text-lg font-bold capitalize ${statusTextColor(service.status)}`}>
              {(service.status as string).replace(/_/g, " ")}
            </p>
            {service.message && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{service.message}</p>}
          </div>

          {/* Response time */}
          <div className="px-5 py-4 border-r border-white/[0.07] bg-white/[0.01]">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-medium flex items-center gap-1"><Zap className="w-2.5 h-2.5" />Response</p>
            {perfRun ? (
              perfRun.success ? (
                <>
                  <p className={`text-lg font-bold font-mono ${latencyColor(perfRun.latencyMs)}`}>{perfRun.latencyMs} ms</p>
                  <p className="text-[11px] text-slate-500 mt-1">Live · {timeAgo(perfRun.lastChecked)}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-red-300">Failed</p>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">{perfRun.errorType ?? "Check failed"}</p>
                </>
              )
            ) : (
              <>
                <p className="text-lg font-bold text-slate-600">–</p>
                <p className="text-[11px] text-slate-500 mt-1">No data yet</p>
              </>
            )}
          </div>

          {/* Active incidents */}
          <div className="px-5 py-4 bg-white/[0.01]">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5 font-medium">Incidents</p>
            <p className={`text-lg font-bold ${active.length > 0 ? "text-red-300" : "text-emerald-400"}`}>
              {active.length > 0 ? active.length : "None"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">{active.length > 0 ? "Ongoing right now" : "All clear"}</p>
          </div>
        </div>
      </div>

      {/* ── Active incidents ── */}
      {active.length > 0 && (
        <div className="mx-7 mb-5">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-3.5 h-3.5 text-red-300 animate-pulse" />
              <span className="text-sm font-semibold text-slate-200">Active incidents<span className="text-white/30">.</span></span>
              <span className="badge badge--alert text-[10px] px-2 py-0.5 ml-1">{active.length} live</span>
            </div>
            <div className="flex flex-col gap-2">
              {active.map((inc: any) => (
                <div key={inc.id} className="rounded-xl border border-red-400/20 bg-red-500/[0.05] px-4 py-3 hover:border-red-400/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{inc.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="badge badge--alert text-[10px] uppercase tracking-wide">{inc.status}</span>
                        {inc.impact && inc.impact !== "none" && (
                          <span className={`badge text-[10px] ${inc.impact === "critical" ? "badge--alert" : "badge--warn"}`}>{inc.impact} impact</span>
                        )}
                        {inc.startedAt && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Started {timeAgo(inc.startedAt)}</span>
                        )}
                      </div>
                    </div>
                    {inc.link && (
                      <a href={inc.link} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-200 transition shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Services / components ── */}
      {(service.components?.length ?? 0) > 0 && (
        <div className="mx-7 mb-5">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">Services<span className="text-white/30">.</span></span>
              <span className="badge badge--neutral text-[10px] px-2 py-0.5 ml-1">{service.components?.length ?? 0}</span>
            </div>
            {(() => {
              const grouped: Record<string, NonNullable<typeof service.components>> = {};
              (service.components ?? []).forEach(c => {
                const g = c.group ?? "General";
                if (!grouped[g]) grouped[g] = [];
                grouped[g]!.push(c);
              });
              const groups = Object.keys(grouped);
              return groups.map(g => (
                <div key={g} className="mb-3 last:mb-0">
                  {groups.length > 1 && <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5 px-1">{g}</p>}
                  <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                    <div className="divide-y divide-white/[0.05]">
                      {grouped[g]!.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition">
                          <div>
                            <p className="text-sm text-slate-200 font-medium">{c.name}</p>
                            {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                          </div>
                          <StatusBadge status={c.status as any} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── Recent incidents ── */}
      <div className="mx-7 mb-7">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">Recent incidents<span className="text-white/30">.</span></span>
            <span className="badge badge--neutral text-[10px] px-2 py-0.5 ml-1">last {recent.length}</span>
          </div>
          {recent.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400/40" />No recent incidents on record
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px_110px] px-4 py-2.5 bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/[0.06]">
                <div>Incident</div><div>Status</div><div>Impact</div><div>When</div>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {recent.map((inc: any, idx: number) => (
                  <div key={inc.id ?? idx} className="grid grid-cols-[1fr_100px_100px_110px] px-4 py-3 items-center hover:bg-white/[0.02] transition">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {inc.status === "resolved"
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                      <span className="text-sm text-slate-300 truncate">{inc.name}</span>
                      {inc.link && (
                        <a href={inc.link} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-slate-400 transition shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div>
                      <span className={`badge text-[10px] ${inc.status === "resolved" ? "badge--success" : "badge--warn"}`}>{inc.status}</span>
                    </div>
                    <div>{impactBadge(inc.impact)}</div>
                    <div className="text-xs text-slate-500">{inc.startedAt ? timeAgo(inc.startedAt) : "–"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/* ─── Overview card ─────────────────────────────────────────── */

function ProviderCard({
  service, onSelect, perfRun, alertsEnabled, isLoggedIn,
}: {
  service: ServiceStatus;
  onSelect: () => void;
  perfRun?: LivePerformanceRun;
  alertsEnabled?: boolean;
  isLoggedIn: boolean;
}) {
  const active = service.incidents?.filter(i => i.status !== "resolved") ?? [];
  const logoBg = LOGO_BG[service.id] ?? "bg-white/5 border-white/10";

  return (
    <button
      onClick={onSelect}
      className="
        group relative overflow-hidden text-left
        rounded-2xl border border-white/10
        bg-gradient-to-b from-white/[0.04] to-white/[0.02]
        p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl
        transition-all hover:border-white/20 hover:shadow-[0_16px_48px_rgba(0,0,0,0.45)]
      "
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${logoBg}`}>
            <ProviderLogo id={service.id} size={20} />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-slate-200">{service.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{service.provider}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot(service.status)}`} />
            <span className={`text-xs font-medium capitalize ${statusTextColor(service.status)}`}>
              {(service.status as string).replace(/_/g, " ")}
            </span>
          </div>
          {perfRun?.success && (
            <span className={`text-xs font-mono font-semibold ${latencyColor(perfRun.latencyMs)}`}>{perfRun.latencyMs} ms</span>
          )}
          {isLoggedIn && alertsEnabled && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
              <Bell className="w-2.5 h-2.5" />Alerts on
            </span>
          )}
        </div>
      </div>

      {(service.components?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(service.components ?? []).slice(0, 5).map(c => (
            <span key={c.id} className={`badge text-[10px] py-0.5 ${(c.status as string) === "operational" ? "badge--success" : "badge--warn"}`}>
              {c.name}
            </span>
          ))}
          {(service.components?.length ?? 0) > 5 && (
            <span className="badge badge--neutral text-[10px] py-0.5">+{(service.components?.length ?? 0) - 5} more</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/[0.07]">
        {active.length > 0 ? (
          <span className="text-red-300 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />{active.length} active incident{active.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />No active incidents
          </span>
        )}
        <span className="text-white/25 group-hover:text-white/50 transition flex items-center gap-1">
          View details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

/* ─── Root component ────────────────────────────────────────── */

export function ProvidersPage({
  services,
  snapshots: _snap,
  runs,
  isLoggedIn = false,
  onGoToIntegrations,
}: {
  services: ServiceStatus[];
  snapshots: ApiCurrentSnapshot[];
  runs: LivePerformanceRun[];
  /** Pass true when a JWT is present in AuthContext */
  isLoggedIn?: boolean;
  /** Called when user clicks "Set up integrations first" — navigate to your integrations tab */
  onGoToIntegrations?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? (services.find(s => s.id === selectedId) ?? null) : null;

  // ── Alert subscription state ─────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState<ProviderAlertSubscription[]>([]);
  const [hasIntegrations, setHasIntegrations] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // providerId → alertsEnabled
  const alertMap = useMemo(
    () => Object.fromEntries(subscriptions.map(s => [s.providerId, s.alertsEnabled])),
    [subscriptions],
  );

  const loadAlertData = useCallback(async () => {
    if (!isLoggedIn) return;
    setAlertLoading(true);
    try {
      const [subs, integrations] = await Promise.all([
        getProviderAlertSubscriptions(),
        getIntegrations().catch(() => []),
      ]);
      setSubscriptions(subs);
      setHasIntegrations(Array.isArray(integrations) && integrations.length > 0);
    } catch {
      // silently fail — button just won't show current state
    } finally {
      setAlertLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { loadAlertData(); }, [loadAlertData]);

  const handleToggleAlert = useCallback(async (providerId: string) => {
    const current = alertMap[providerId] ?? false;
    setSavingId(providerId);
    try {
      const updated = await setProviderAlert(providerId, !current);
      setSubscriptions(prev => {
        const exists = prev.find(s => s.providerId === providerId);
        if (exists) return prev.map(s => s.providerId === providerId ? updated : s);
        return [...prev, updated];
      });
    } catch (err) {
      console.error("Failed to toggle provider alert:", err);
    } finally {
      setSavingId(null);
    }
  }, [alertMap]);

  // ── Perf + layout ────────────────────────────────────────────────────────────

  const perfMap = useMemo(
    () => Object.fromEntries(runs.map(r => [r.provider.id, r])),
    [runs],
  );

  const overall = useMemo(() => {
    const outage   = services.some(s => ["outage","major_outage"].includes(s.status as string) && (s.incidents?.some(i => i.status !== "resolved") ?? false));
    const degraded = services.some(s => ["degraded","degraded_performance","partial_outage"].includes(s.status as string));
    if (outage)   return { label: "Major Outage",         color: "text-red-300",    dot: "bg-red-400" };
    if (degraded) return { label: "Degraded Performance", color: "text-amber-300",  dot: "bg-amber-400" };
    return         { label: "All Systems Operational",    color: "text-emerald-400", dot: "bg-emerald-400" };
  }, [services]);

  return (
    <div
      className="flex overflow-hidden rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
      style={{ minHeight: "calc(100vh - 200px)" }}
    >
      {/* ── Sidebar ── */}
      <div className="w-64 shrink-0 border-r border-white/[0.07] flex flex-col bg-white/[0.015] backdrop-blur-xl">

        <div className="px-4 py-3.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2 h-2 rounded-full ${overall.dot}`} />
            <span className={`text-xs font-semibold ${overall.color}`}>{overall.label}</span>
          </div>
          <p className="text-[10px] text-slate-600">{services.length} providers monitored</p>
        </div>

        <div className="px-4 py-2.5 border-b border-white/[0.07]">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Providers</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {services.map(s => (
            <SidebarItem
              key={s.id}
              service={s}
              selected={selectedId === s.id}
              onSelect={() => setSelectedId(s.id)}
              perfRun={perfMap[s.id]}
              alertsEnabled={alertMap[s.id]}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white/[0.01]">
        {selected ? (
          <ProviderDetail
            service={selected}
            onBack={() => setSelectedId(null)}
            perfRun={perfMap[selected.id]}
            isLoggedIn={isLoggedIn}
            alertsEnabled={alertMap[selected.id] ?? false}
            hasIntegrations={hasIntegrations}
            alertLoading={alertLoading}
            alertSaving={savingId === selected.id}
            onToggleAlert={() => handleToggleAlert(selected.id)}
            onGoToIntegrations={onGoToIntegrations ?? (() => {})}
          />
        ) : (
          <div className="p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-200">
                Providers<span className="text-white/25">.</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">Select a provider to see its current status, services, and incidents</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {services.map(s => (
                <ProviderCard
                  key={s.id}
                  service={s}
                  onSelect={() => setSelectedId(s.id)}
                  perfRun={perfMap[s.id]}
                  alertsEnabled={alertMap[s.id]}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}