"use client";

import { Activity, AlertTriangle, FileText, Wrench, Users, Zap } from "lucide-react";

type Tab = "MONITORING" | "INCIDENTS" | "INTEGRATIONS";

const NAV_ITEMS = [
  { id: "MONITORING" as Tab, label: "Monitoring", icon: Activity },
  { id: "INCIDENTS" as Tab, label: "Incidents", icon: AlertTriangle },
  { id: "INTEGRATIONS" as Tab, label: "Integrations & API", icon: Zap },
];

const BOTTOM_ITEMS = [
  { label: "Status pages", icon: FileText },
  { label: "Maintenance", icon: Wrench },
  { label: "Team members", icon: Users },
];

export function MonitorSidebar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="w-56 shrink-0 flex flex-col       overflow-hidden rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          <span className="text-white font-bold text-base tracking-tight">Custom Monitoring</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-green-400" : ""}`} />
              {label}
            </button>
          );
        })}

        <div className="my-3 border-t border-slate-800/60" />

        {BOTTOM_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-all cursor-not-allowed opacity-60"
            disabled
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      {/* <div className="px-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50">
          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            U
          </div>
          <div className="text-xs text-slate-300 truncate">My Account</div>
          <span className="ml-auto text-slate-500 text-xs">···</span>
        </div>
        <button className="w-full bg-green-500 hover:bg-green-400 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
          Upgrade now
        </button>
      </div> */}
    </div>
  );
}