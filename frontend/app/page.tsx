"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { AuthHeader } from "../components/AuthHeader";
import type { ServiceStatus, Incident } from "../lib/types";
import type {
  ApiCurrentSnapshot,
  ApiComponentGroup,
  ApiRecentIncident,
} from "../lib/api-types";
import { IncidentTimeline } from "../components/IncidentTimeline";
import { LivePerformanceRun } from "../lib/performance-types";
import { ProfileView } from "../components/ProfileView";
import { ProvidersPage } from "../components/ProvidersPage";
import { useAppView } from "./context/AppViewContext";
import MonitorDashboard from "../components/MonitorDashboard";

/* ---------------- FETCH ---------------- */

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed ${url}`);
  return res.json();
}

export default function Page() {
  const { view, setView } = useAppView();
const { user } = useAuth();

  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [liveRuns, setLiveRuns] = useState<LivePerformanceRun[]>([]);
  const [snapshots, setSnapshots] = useState<ApiCurrentSnapshot[]>([]);

  async function load() {
    const [snapshotsRes, components, recent, active] = await Promise.all([
      // Provider status badges + response times
      fetchJSON<ApiCurrentSnapshot[]>("http://localhost:3001/status/live"),
      // Service-level component drilldown
      fetchJSON<ApiComponentGroup[]>("http://localhost:3001/status/components"),
      // All incidents (active + resolved) — for the "Recent incidents" panel per provider
      fetchJSON<ApiRecentIncident[]>(
        "http://localhost:3001/status/recent-incidents?limit=40"
      ),
      // Active-only incidents — for the incident stream timeline
      fetchJSON<ApiRecentIncident[]>(
        "http://localhost:3001/status/active-incidents"
      ),
    ]);

    const perfRes = await fetch("http://localhost:3001/performance/live", {
      cache: "no-store",
    });
    const perf = await perfRes.json();

    // ── Component map ─────────────────────────────────────────────────────────
    const componentMap = new Map<string, ApiComponentGroup>();
    components.forEach((g) => componentMap.set(g.providerId, g));

    // ── Recent incidents map (per provider, all statuses) ─────────────────────
    // Used in ProvidersPage for the "Recent incidents" table.
    // We split: show active ones first, then resolved.
    const recentMap = new Map<string, Incident[]>();
    for (const r of recent) {
      if (!recentMap.has(r.provider.id)) recentMap.set(r.provider.id, []);
      recentMap.get(r.provider.id)!.push({
        id:        r.id,
        name:      r.name,
        status:    r.status,
        impact:    r.impact as any,
        startedAt: r.startedAt,
        link:      r.link,
      });
    }

    // Sort each provider's incidents: active first, then resolved by date
    recentMap.forEach((incidents, key) => {
      incidents.sort((a, b) => {
        const aActive = a.status !== "resolved" ? 1 : 0;
        const bActive = b.status !== "resolved" ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive; // active first
        return (
          new Date(b.startedAt ?? 0).getTime() -
          new Date(a.startedAt ?? 0).getTime()
        );
      });
      recentMap.set(key, incidents.slice(0, 10));
    });

    // ── Normalized services ───────────────────────────────────────────────────
    const normalized: ServiceStatus[] = snapshotsRes.map((row) => ({
      id:          row.provider.id,
      name:        row.provider.name,
      provider:    row.provider.host,
      status:      row.status as ServiceStatus["status"],
      message:     row.message,
      lastChecked: row.checkedAt,

      // incidents[] on the service object: used for status badge derivation
      // We use active incidents from recentMap here
      incidents: (recentMap.get(row.provider.id) ?? []).filter(
        (i) => i.status !== "resolved"
      ),

      components:
        componentMap
          .get(row.provider.id)
          ?.components.map((c) => ({
            id:          c.id,
            name:        c.name,
            status:      c.status as any,
            description: c.description,
            group:       c.group,
          })) ?? [],

      recentIncidents: recentMap.get(row.provider.id) ?? [],
    }));

    // ── Incident stream timeline ──────────────────────────────────────────────
    // Built exclusively from active-incidents endpoint (status != 'resolved').
    // Each provider name is looked up from normalized services.
    const providerNameMap = new Map<string, string>(
      normalized.map((s) => [s.id, s.name])
    );

    const tl = active.map((inc) => ({
      service:  providerNameMap.get(inc.provider.id) ?? inc.provider.id,
      incident: {
        id:        inc.id,
        name:      inc.name,
        status:    inc.status,
        impact:    inc.impact as any,
        startedAt: inc.startedAt,
        link:      inc.link,
      },
    }));

    setServices(normalized);
    setTimeline(tl);
    setLiveRuns(perf);
    setSnapshots(snapshotsRes);
  }

  /* ---------------- POLLING ---------------- */

  useEffect(() => {
    if (view !== "HOME") return;

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [view]);

  /* ---------------- UI ---------------- */

  return (
    <>
      <AuthHeader />

      <br />

      {/* PROFILE */}
      {view === "PROFILE" && (
        <ProfileView onBack={() => setView("HOME")} />
      )}

      {/* MONITOR */}
      {view === "MONITOR" && <MonitorDashboard onBack={() => setView("HOME")} />}

      {/* HOME */}
      {view === "HOME" && (
        <>
          <br />
          <div className="hero">
            <div>
              <div className="hero-title">Realtime LLM Service Monitor</div>
              <div className="hero-sub">
                Live status, service drilldowns, and incident tracking for
                OpenAI, Anthropic, Gemini, and Grok.
              </div>
            </div>
          </div>

          {/* Incident stream — active incidents only */}
          <div className="section-title">Incident stream</div>
          <IncidentTimeline incidents={timeline} />

          {/* Providers — UptimeRobot-style panel */}
          <div className="section-title">Providers</div>
          <ProvidersPage
            services={services}
            snapshots={snapshots}
            runs={liveRuns}
            isLoggedIn={!!user}
            onGoToIntegrations={() => setView("MONITOR")}
          />
        </>
      )}
    </>
  );
}