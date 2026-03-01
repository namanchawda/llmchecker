"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
} from "../lib/api";
import {
  Plus, Trash2, Pencil, X, Check, Send,
  ToggleLeft, ToggleRight, Bell, BellOff, Zap, Mail,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────── */
type IntegrationType = "slack" | "discord" | "telegram" | "teams" | "email";

type Integration = {
  id: string;
  type: IntegrationType;
  name: string;
  webhookUrl: string;
  chatId: string;
  emailAddress: string;
  alertOnDown: boolean;
  alertOnRecovery: boolean;
  isEnabled: boolean;
};

/* ─── Channel definitions ────────────────────────────── */
type ChannelDef = {
  label: string;
  accentClass: string;       // text color
  bgClass: string;           // bg + border for selected state
  pillClass: string;         // badge bg
  icon: React.ReactNode;
  credential: { field: "webhookUrl" | "chatId" | "emailAddress"; label: string; placeholder: string; type?: string };
  hint?: React.ReactNode;
};

const CHANNELS: Record<IntegrationType, ChannelDef> = {
  slack: {
    label: "Slack",
    accentClass: "text-[#E01E5A]",
    bgClass: "bg-[#4A154B]/25 border-[#E01E5A]/50",
    pillClass: "bg-[#4A154B]/30 text-[#E01E5A]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 127 127">
        <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80z" fill="#E01E5A"/>
        <path d="M33.9 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
        <path d="M47.1 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.9 6.7 39.8.8 47.1.8c7.3 0 13.2 5.9 13.2 13.2v13.2H47.1z" fill="#36C5F0"/>
        <path d="M47.1 33.9c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H14.1C6.8 60.3.9 54.4.9 47.1c0-7.3 5.9-13.2 13.2-13.2h33z" fill="#36C5F0"/>
        <path d="M99.8 47.1c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V47.1z" fill="#2EB67D"/>
        <path d="M93.1 47.1c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V14.1C66.7 6.8 72.6.9 79.9.9c7.3 0 13.2 5.9 13.2 13.2v33z" fill="#2EB67D"/>
        <path d="M79.9 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2z" fill="#ECB22E"/>
        <path d="M79.9 93.1c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2h-33z" fill="#ECB22E"/>
      </svg>
    ),
    credential: { field: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/T.../B.../..." },
    hint: <span>Create an <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="text-blue-400 underline">Incoming Webhook</a> in your Slack app settings.</span>,
  },
  discord: {
    label: "Discord",
    accentClass: "text-[#5865F2]",
    bgClass: "bg-[#5865F2]/20 border-[#5865F2]/50",
    pillClass: "bg-[#5865F2]/25 text-[#7c85f5]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 127 96" fill="none">
        <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" fill="#5865F2"/>
      </svg>
    ),
    credential: { field: "webhookUrl", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/..." },
    hint: <span>In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL.</span>,
  },
  teams: {
    label: "Microsoft Teams",
    accentClass: "text-[#6264A7]",
    bgClass: "bg-[#6264A7]/20 border-[#6264A7]/50",
    pillClass: "bg-[#6264A7]/25 text-[#8b8dd4]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 96 96" fill="none">
        <path d="M58.69 27.35a10.11 10.11 0 1 0 0-20.22 10.11 10.11 0 0 0 0 20.22z" fill="#5059C9"/>
        <path d="M74.31 30.43H45.57a2.74 2.74 0 0 0-2.74 2.74v25.27a20.45 20.45 0 0 0 11.25 18.18 20.44 20.44 0 0 0 22.07-2.95 20.46 20.46 0 0 0 6.89-15.23V34.2a3.78 3.78 0 0 0-3.77-3.78h-.96z" fill="#5059C9"/>
        <path d="M40.11 33.91a14.35 14.35 0 1 0 0-28.7 14.35 14.35 0 0 0 0 28.7z" fill="#7B83EB"/>
        <path d="M62.74 36.98H14.74A3.74 3.74 0 0 0 11 40.72v27.13a26.09 26.09 0 0 0 52.18 0V40.72a3.74 3.74 0 0 0-3.44-3.74z" fill="#7B83EB"/>
        <path d="M42.87 42.47v31.71a2.87 2.87 0 0 1-1.76 2.64 2.86 2.86 0 0 1-1.11.22H16.63a26.4 26.4 0 0 1-.63-5.73V40.72a3.74 3.74 0 0 1 3.74-3.74h23.13v5.49z" fill="url(#teams-a)" fillOpacity=".5"/>
        <path d="M39.13 42.47v34.57a2.86 2.86 0 0 1-2.87 2.86H18.35a26.09 26.09 0 0 1-7.35-18.57V40.72a3.74 3.74 0 0 1 3.74-3.74h24.39v5.49z" fill="url(#teams-b)" fillOpacity=".5"/>
        <path d="M39.13 42.47v29.09a2.87 2.87 0 0 1-2.87 2.87H12.27a26.07 26.07 0 0 1-1.27-8V40.72a3.74 3.74 0 0 1 3.74-3.74h24.39v5.49z" fill="url(#teams-c)" fillOpacity=".5"/>
        <path d="M14.74 36.98h24.39v29.96H14.74a3.74 3.74 0 0 1-3.74-3.74V40.72a3.74 3.74 0 0 1 3.74-3.74z" fill="url(#teams-d)" fillOpacity=".5"/>
        <path d="M52.87 42.47H27.13v23.44a13 13 0 0 0 13 13h12.74V42.47z" fill="#4B53BC"/>
        <path d="M40 48.77h4.41v15.51H40zm0-4.82h4.41v3.32H40z" fill="white"/>
        <defs>
          <linearGradient id="teams-a" x1="29.13" y1="36.98" x2="29.13" y2="79.9" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="teams-b" x1="25.07" y1="36.98" x2="25.07" y2="79.9" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="teams-c" x1="25.07" y1="36.98" x2="25.07" y2="71.43" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="teams-d" x1="14.74" y1="53.47" x2="39.13" y2="53.47" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    credential: { field: "webhookUrl", label: "Incoming Webhook URL", placeholder: "https://yourorg.webhook.office.com/..." },
    hint: <span>In Teams: channel → ··· → Connectors → Incoming Webhook → Configure.</span>,
  },
  telegram: {
    label: "Telegram",
    accentClass: "text-[#26A5E4]",
    bgClass: "bg-[#26A5E4]/15 border-[#26A5E4]/50",
    pillClass: "bg-[#26A5E4]/20 text-[#26A5E4]",
    icon: (
      <svg width="20" height="20" viewBox="0 0 96 96" fill="none">
        <circle cx="48" cy="48" r="48" fill="url(#tg-g)"/>
        <path d="M39.5 67.5c-1.4 0-1.16-.53-1.64-1.88L34 53.2 63 36" fill="#C8DAEA"/>
        <path d="M39.5 67.5c1 0 1.44-.46 2-1l5.33-5.18-6.63-4" fill="#A9C9DD"/>
        <path d="M40.2 57.32l16.07 11.87c1.83 1.01 3.15.49 3.6-1.7l6.52-30.73c.67-2.67-.99-3.88-2.71-3.09L19.24 47.53c-2.61 1.05-2.59 2.5-.47 3.15l10.14 3.17 23.49-14.81c1.11-.67 2.12-.31 1.29.43" fill="url(#tg-b)"/>
        <defs>
          <linearGradient id="tg-g" x1="48" y1="0" x2="48" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2AABEE"/>
            <stop offset="1" stopColor="#229ED9"/>
          </linearGradient>
          <linearGradient id="tg-b" x1="55.53" y1="46.75" x2="37.53" y2="65.25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EFF7FC"/>
            <stop offset="1" stopColor="white"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    credential: { field: "chatId", label: "Chat ID", placeholder: "-1001234567890 or @yourchannel" },
    hint: (
      <span>
        1. Create a bot via <span className="text-slate-300">@BotFather</span>.{" "}
        2. Add it to your group/channel.{" "}
        3. Get the Chat ID from <code className="text-slate-300">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>.{" "}
        4. Set <code className="text-slate-300">TELEGRAM_BOT_TOKEN</code> in your backend .env.
      </span>
    ),
  },
  email: {
    label: "Email",
    accentClass: "text-amber-400",
    bgClass: "bg-amber-400/15 border-amber-400/50",
    pillClass: "bg-amber-400/20 text-amber-400",
    icon: (
      <svg width="20" height="20" viewBox="0 0 96 96" fill="none">
        <rect width="96" height="96" rx="16" fill="#F59E0B"/>
        <rect x="12" y="24" width="72" height="48" rx="6" fill="white"/>
        <path d="M12 30l36 24 36-24" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    credential: { field: "emailAddress", label: "Recipient Email", placeholder: "alerts@yourcompany.com", type: "email" },
    hint: (
      <span>
        Set <code className="text-slate-300">SMTP_HOST</code>, <code className="text-slate-300">SMTP_PORT</code>,{" "}
        <code className="text-slate-300">SMTP_USER</code>, <code className="text-slate-300">SMTP_PASS</code> in your backend .env.
        Without those, alerts are caught by Ethereal and a preview URL is logged.
      </span>
    ),
  },
};

/* ─── Small Toggle button ─────────────────────────────── */
function AlertToggle({
  label, on, color, onClick,
}: { label: string; on: boolean; color: "red" | "green"; onClick: () => void }) {
  const activeClass = color === "red"
    ? "bg-red-500/20 border-red-500/40 text-red-400"
    : "bg-green-500/20 border-green-500/40 text-green-400";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
        on ? activeClass : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
      }`}
    >
      {on ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
      {label}
    </button>
  );
}

/* ─── Add / Edit Modal ────────────────────────────────── */
function IntegrationModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Integration | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<IntegrationType>(editing?.type ?? "slack");
  const [name, setName] = useState(editing?.name ?? "");
  const [credValue, setCredValue] = useState(() => {
    if (!editing) return "";
    return editing.type === "telegram" ? editing.chatId
      : editing.type === "email" ? editing.emailAddress
      : editing.webhookUrl;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ch = CHANNELS[type];

  async function save() {
    if (!name.trim() || !credValue.trim()) { setError("All fields are required"); return; }
    setLoading(true); setError("");
    try {
      const payload: any = { type, name, [ch.credential.field]: credValue };
      if (editing) await updateIntegration(editing.id, payload);
      else await createIntegration(payload);
      onSaved(); onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#141720] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold text-base">{editing ? "Edit" : "New"} Integration</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Channel picker (disabled on edit) */}
          {!editing && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 block">Channel</label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(CHANNELS) as IntegrationType[]).map((t) => {
                  const c = CHANNELS[t];
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { setType(t); setCredValue(""); }}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                        active ? `${c.bgClass} ${c.accentClass}` : "bg-slate-800/50 border-slate-700/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span className={active ? c.accentClass : "text-slate-500"}>{c.icon}</span>
                      {c.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Label</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${ch.label} Ops Alerts`}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Credential */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{ch.credential.label}</label>
            <input
              type={ch.credential.type ?? "text"}
              value={credValue} onChange={(e) => setCredValue(e.target.value)}
              placeholder={ch.credential.placeholder}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 font-mono"
            />
            {ch.hint && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ch.hint}</p>}
          </div>

          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</div>}

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              {loading ? "Saving…" : editing ? "Update" : "Add Integration"}
            </button>
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Integration Card ────────────────────────────────── */
function IntegrationCard({
  integration, onRefresh,
}: { integration: Integration; onRefresh: () => void }) {
  const ch = CHANNELS[integration.type];
  const [testState, setTestState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [editing, setEditing] = useState(false);

  async function handleTest() {
    setTestState("sending");
    try {
      await testIntegration(integration.id);
      setTestState("ok");
    } catch { setTestState("err"); }
    setTimeout(() => setTestState("idle"), 3000);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${integration.name}"? This cannot be undone.`)) return;
    await deleteIntegration(integration.id);
    onRefresh();
  }

  async function toggleEnabled() {
    await updateIntegration(integration.id, { isEnabled: !integration.isEnabled });
    onRefresh();
  }

  async function toggleAlert(field: "alertOnDown" | "alertOnRecovery") {
    await updateIntegration(integration.id, { [field]: !integration[field] });
    onRefresh();
  }

  const credPreview =
    integration.type === "telegram" ? `Chat ID: ${integration.chatId || "—"}`
    : integration.type === "email" ? integration.emailAddress || "—"
    : (integration.webhookUrl || "—").replace(/^https?:\/\//, "").slice(0, 48) + "…";

  return (
    <>
      <div className={`rounded-xl border transition-all ${integration.isEnabled ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-900/20 border-slate-800/40 opacity-55"}`}>
        {/* Top row */}
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Icon pill */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${ch.bgClass} ${ch.accentClass}`}>
            {ch.icon}
          </div>

          {/* Name + credential preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{integration.name}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ch.pillClass}`}>{ch.label}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate font-mono">{credPreview}</div>
          </div>

          {/* Status */}
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${
            integration.isEnabled
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-slate-700/60 border-slate-600 text-slate-500"
          }`}>
            {integration.isEnabled ? "Active" : "Disabled"}
          </span>

          {/* Test */}
          <button onClick={handleTest} disabled={testState === "sending"}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border shrink-0 transition-colors ${
              testState === "ok" ? "bg-green-500/20 border-green-500/40 text-green-400"
              : testState === "err" ? "bg-red-500/20 border-red-500/40 text-red-400"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}>
            {testState === "ok" ? <Check className="w-3.5 h-3.5" /> : testState === "err" ? <X className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            {testState === "sending" ? "Sending…" : testState === "ok" ? "Sent!" : testState === "err" ? "Failed" : "Test"}
          </button>

          {/* Enable/disable toggle */}
          <button onClick={toggleEnabled} className="transition-colors shrink-0" title={integration.isEnabled ? "Disable" : "Enable"}>
            {integration.isEnabled
              ? <ToggleRight className="w-7 h-7 text-green-400" />
              : <ToggleLeft className="w-7 h-7 text-slate-500" />}
          </button>

          {/* Edit */}
          <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button onClick={handleDelete} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alert trigger row */}
        <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-800/60 bg-slate-900/20">
          <span className="text-xs text-slate-500 font-medium mr-1">Notify when:</span>
          <AlertToggle
            label="Scheduler goes down"
            on={integration.alertOnDown}
            color="red"
            onClick={() => toggleAlert("alertOnDown")}
          />
          <AlertToggle
            label="Scheduler recovers"
            on={integration.alertOnRecovery}
            color="green"
            onClick={() => toggleAlert("alertOnRecovery")}
          />
        </div>
      </div>

      {editing && (
        <IntegrationModal
          editing={integration}
          onClose={() => setEditing(false)}
          onSaved={() => { onRefresh(); setEditing(false); }}
        />
      )}
    </>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────────── */
export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getIntegrations();
      setIntegrations(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex-1 overflow-y-auto px-7 py-7  min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Integrations & API<span className="text-slate-500">.</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Get notified on Slack, Discord, Teams, Telegram or Email when any scheduler goes down or recovers.
            {/* Alerts are <span className="text-slate-300 font-medium">global</span> — they fire for all schedulers. */}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0 ml-6"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Channel icons overview */}
      <div className="flex items-center gap-3 my-6 py-4 px-5 bg-slate-800/30 border border-slate-800 rounded-xl">
        <span className="text-xs text-slate-500 font-medium mr-1">Supported:</span>
        {(Object.keys(CHANNELS) as IntegrationType[]).map((t) => {
          const c = CHANNELS[t];
          const count = integrations.filter((i) => i.type === t).length;
          return (
            <div key={t} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
              count > 0 ? `${c.bgClass} ${c.accentClass}` : "bg-slate-800/50 border-slate-700/40 text-slate-600"
            }`}>
              <span className={count > 0 ? c.accentClass : "text-slate-600"}>{c.icon}</span>
              {c.label}
              {count > 0 && <span className="ml-0.5 font-semibold">{count}</span>}
            </div>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Loading…</div>
      ) : integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-700 rounded-2xl text-center">
          <Zap className="w-12 h-12 text-slate-700 mb-4" />
          <div className="text-base font-semibold text-slate-400">No integrations yet</div>
          <div className="text-sm text-slate-600 mt-1 mb-6 max-w-xs">
            Connect a notification channel to get alerted whenever a scheduler goes down or recovers.
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add your first integration
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {integrations.map((i) => (
            <IntegrationCard key={i.id} integration={i} onRefresh={load} />
          ))}
        </div>
      )}

      {showAdd && (
        <IntegrationModal
          editing={null}
          onClose={() => setShowAdd(false)}
          onSaved={() => { load(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}