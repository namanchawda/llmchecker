"use client";

import { useState } from "react";
import { Incident, ServiceStatus } from "../lib/types";

type Props = {
  services: ServiceStatus[];
  liveSnapshots: any[];
};

const PROVIDER_ID_MAP: Record<string, string> = {
  "status.openai.com": "openai",
  openai: "openai",

  "status.anthropic.com": "anthropic",
  anthropic: "anthropic",

  "status.cloud.google.com": "gemini",
  gemini: "gemini",

  "status.x.ai": "grok",
  grok: "grok",
};

// ✅ "All" tab removed
const PROVIDER_TABS = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini", label: "Gemini" },
  { id: "grok", label: "Grok" },
];

function statusBadge(status: string) {
  switch (status) {
    case "resolved":      return "border-emerald-400/50 text-emerald-300 bg-emerald-500/10";
    case "monitoring":    return "border-sky-400/50 text-sky-300 bg-sky-500/10";
    case "investigating": return "border-red-500/50 text-red-400 bg-red-500/10";
    case "identified":    return "border-amber-400/50 text-amber-300 bg-amber-500/10";
    default:              return "border-slate-400/40 text-slate-300 bg-white/5";
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

export function RecentIncidents({ services, liveSnapshots }: Props) {
  // ✅ Default is now "openai" instead of "all"
  const [activeProvider, setActiveProvider] = useState("openai");

  /* 🔴 LIVE INCIDENTS */
  const liveIncidents = liveSnapshots.flatMap((snapshot) =>
    (snapshot.incidents ?? []).map((incident: Incident) => ({
      providerId:
        PROVIDER_ID_MAP[snapshot.provider.id] ??
        PROVIDER_ID_MAP[snapshot.provider.host],
      serviceName: snapshot.provider.name,
      incident,
      isLive: true,
    })),
  );

  /* ✅ HISTORICAL INCIDENTS */
  const historicalIncidents = services.flatMap((service) =>
    (service.recentIncidents ?? []).map((incident) => ({
      providerId: PROVIDER_ID_MAP[service.provider],
      serviceName: service.name,
      incident,
      isLive: false,
    })),
  );

  const incidents = [...liveIncidents, ...historicalIncidents];

  // ✅ Always filter by provider — no "all" branch needed
  const filteredIncidents = incidents.filter((i) => i.providerId === activeProvider);

  return (
    <div className="card space-y-4">
      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2">
        {PROVIDER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveProvider(tab.id)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg border transition
              ${
                activeProvider === tab.id
                  ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-slate-300 hover:bg-white/5"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {filteredIncidents.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-6 text-center">
          <div className="text-slate-400 text-sm">
            No recent incidents for this provider.
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIncidents.slice(0, 10).map(({ serviceName, incident, isLive }) => (
            <div
              key={`${incident.id}-${isLive ? "live" : "history"}`}
              className="
                group relative overflow-hidden rounded-xl border border-white/10
                bg-gradient-to-b from-white/[0.04] to-white/[0.02]
                p-4 transition-all duration-300
                hover:border-white/20 hover:bg-white/[0.05]
              "
            >
              {/* HEADER */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold tracking-tight">{serviceName}</div>
                  <div className="text-xs text-slate-400">
                    {incident.startedAt
                      ? new Date(incident.startedAt).toLocaleString()
                      : "Unknown time"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${statusBadge(incident.status)}`}>
                    {incident.status.toUpperCase()}
                  </span>
                  {isLive && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full border border-red-500/50 text-red-400 bg-red-500/10 animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* TITLE */}
              <div className="text-sm font-medium mb-2">{incident.name}</div>

              {/* IMPACT */}
              {incident.impact && (
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${impactBadge(incident.impact)}`}>
                  IMPACT: {incident.impact.toUpperCase()}
                </span>
              )}

              {/* LINK */}
              {incident.link && (
                <a
                  href={incident.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                >
                  View details →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}