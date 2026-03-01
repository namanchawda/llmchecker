"use client";

import { useState, useEffect } from "react";
import { createJob, updateJob } from "../lib/api";
import {
  Loader2,
  Plus,
  AlertCircle,
  Key,
  Clock,
  Bot,
  MessageSquare,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

type Props = {
  onCreated: () => void;
  editJob?: any | null;
  onUpdated?: () => void;
  onCancelEdit?: () => void;
};

const MODELS = [
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
];

const INTERVAL_PRESETS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
  { label: "30m", value: 1800 },
  { label: "1h", value: 3600 },
];

const MIN_SECONDS = 10; // 10 seconds
const MAX_SECONDS = 86400; // 24 hours

function secondsToHMS(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { h, m, sec };
}

function hmsToSeconds(h: number, m: number, s: number) {
  return h * 3600 + m * 60 + s;
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let out = `${h}h`;
  if (m > 0) out += ` ${m}m`;
  if (s > 0) out += ` ${s}s`;
  return out;
}

export default function CreateJobForm({
  onCreated,
  editJob,
  onUpdated,
  onCancelEdit,
}: Props) {
  const [model, setModel] = useState(editJob?.model ?? "gpt-4.1-mini");
  const [apiKey, setApiKey] = useState(editJob?.encryptedApiKey ?? "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(
    editJob?.intervalSeconds ?? 60,
  );
  const [prompt, setPrompt] = useState(editJob?.prompt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // H/M/S derived state
  const [hms, setHms] = useState(secondsToHMS(editJob?.intervalSeconds ?? 60));

  useEffect(() => {
    if (!editJob) return;
    setModel(editJob.model);
    setApiKey(editJob.encryptedApiKey);
    setIntervalSeconds(editJob.intervalSeconds);
    setHms(secondsToHMS(editJob.intervalSeconds));
    setPrompt(editJob.prompt);
  }, [editJob]);

  function updateHMS(field: "h" | "m" | "sec", raw: string) {
    const val = Math.max(0, parseInt(raw || "0", 10));
    const next = {
      ...hms,
      [field]: field === "h" ? Math.min(val, 24) : Math.min(val, 59),
    };
    // enforce 24h cap
    const total = hmsToSeconds(next.h, next.m, next.sec);
    if (total > MAX_SECONDS) return;
    if (total < MIN_SECONDS && total !== 0) return; // enforce 10s minimum (allow zeroing while typing)
    setHms(next);
    setIntervalSeconds(total);
  }

  function applyPreset(value: number) {
    setIntervalSeconds(value);
    setHms(secondsToHMS(value));
  }

  const isValid =
    apiKey.trim() &&
    model.trim() &&
    prompt.trim() &&
    intervalSeconds >= MIN_SECONDS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (editJob) {
        await updateJob(editJob.id, {
          provider: "openai",
          model,
          apiKey,
          intervalSeconds,
          prompt,
        });
        onUpdated?.();
      } else {
        const res = await createJob({
          provider: "openai",
          model,
          apiKey,
          intervalSeconds,
          prompt,
        });
        if (!res?.id) {
          setError("Invalid response from server");
          return;
        }
        setApiKey("");
        setPrompt("");
        setIntervalSeconds(60);
        setHms({ h: 0, m: 1, sec: 0 });
        onCreated();
      }
    } catch {
      setError(
        editJob ? "Failed to update scheduler" : "Failed to create scheduler",
      );
    } finally {
      setLoading(false);
    }
  }

  const activePreset = INTERVAL_PRESETS.find(
    (p) => p.value === intervalSeconds,
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {editJob ? "Edit Scheduler" : "New Scheduler"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule automated AI prompt runs
          </p>
        </div>
        <button
          onClick={onCancelEdit}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 flex-1">
        {/* Prompt */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Prompt
          </label>
          <textarea
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="What should the AI run on every tick?"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* API Key */}
        <div className="relative">
          <input
            required
            type={showApiKey ? "text" : "password"}
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => setShowApiKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Bot className="w-3.5 h-3.5" /> Model
          </label>
          <select
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Interval */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Check Interval
            </label>
            <span className="text-xs text-slate-400">
              ={" "}
              <span className="text-white font-semibold">
                {formatDuration(intervalSeconds)}
              </span>
              <span className="text-slate-600 ml-1">({intervalSeconds}s)</span>
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex gap-1.5 flex-wrap">
            {INTERVAL_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => applyPreset(p.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activePreset?.value === p.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* H / M / S inputs */}
          <div className="grid grid-cols-3 gap-2">
            {(["h", "m", "sec"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 text-center uppercase tracking-wider">
                  {field === "h"
                    ? "Hours"
                    : field === "m"
                      ? "Minutes"
                      : "Seconds"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={field === "h" ? 24 : 59}
                  value={hms[field]}
                  onChange={(e) => updateHMS(field, e.target.value)}
                  className="w-full px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white text-center focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">
            Min 10 seconds · Max 24 hours. Presets update the boxes above.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 pt-1 mt-auto">
          <button
            type="submit"
            disabled={!isValid || loading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {editJob ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {editJob ? "Update Scheduler" : "Create Scheduler"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
