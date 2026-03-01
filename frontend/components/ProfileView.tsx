'use client';

import { useState } from "react";
import { useAuth } from "../app/context/AuthContext";
import { ApiKeyPanel } from "./ApiKeyPanel";
import { Eye, EyeOff, Copy, Check, ArrowLeft, User, Mail, Key, Terminal, Globe } from "lucide-react";

type props = {
  onBack: () => void;
};

const API_ENDPOINT = "http://localhost:3001/monitor/api/v1/status";

export function ProfileView({ onBack }: props) {
  const { user } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors self-start">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <p className="text-slate-500">Please login to view profile</p>
      </div>
    );
  }

  const curlSnippet = `curl -X GET "${API_ENDPOINT}" \\
  -H "api-key: ${user.apiKey ?? '<your-api-key>'}"`;

  return (
    <div className="max-w-lg mx-auto mt-8 px-4 pb-12">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-blue-300 tracking-tight">{getInitials(user.name)}</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">{user.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Personal account</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">

        {/* Name */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">Name</p>
            <p className="text-sm text-slate-200 font-medium truncate">{user.name}</p>
          </div>
        </div>

        {/* Email */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mb-0.5">Email</p>
            <p className="text-sm text-slate-200 font-medium truncate">{user.email}</p>
          </div>
        </div>

        {/* API Key */}
        {user.apiKey ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Key className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">Platform API Key</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-xs bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2.5 text-slate-300 break-all leading-relaxed">
                {showKey ? user.apiKey : "•".repeat(40)}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => setShowKey(!showKey)}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                  title={showKey ? "Hide key" : "Show key"}>
                  {showKey ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <button onClick={() => copy(user.apiKey!, setCopiedKey)}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                  title="Copy key">
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ApiKeyPanel />
        )}

        {/* ── API Access section — only show if they have an api key ── */}
        {user.apiKey && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 mt-1">

            {/* Section header */}
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">API Access</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Use your API key to fetch your scheduler statuses programmatically.
              Pass it as an <span className="text-slate-300 font-mono bg-white/[0.06] px-1 py-0.5 rounded">api-key</span> header in every request.
            </p>

            {/* Endpoint row */}
            <div className="mb-3">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">Endpoint</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2">
                  <span className="text-[10px] font-semibold text-emerald-400 shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">GET</span>
                  <span className="font-mono text-xs text-slate-300 truncate">{API_ENDPOINT}</span>
                </div>
                <button
                  onClick={() => copy(API_ENDPOINT, setCopiedEndpoint)}
                  className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition-colors"
                  title="Copy endpoint"
                >
                  {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Required header */}
            <div className="mb-4">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">Required Header</p>
              <div className="bg-black/30 border border-white/[0.06] rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-amber-300 shrink-0">api-key</span>
                    <span className="text-white/20 text-xs shrink-0">:</span>
                    <span className="font-mono text-xs text-slate-400 truncate">
                      {showKey ? user.apiKey : `${user.apiKey.slice(0, 8)}${"•".repeat(20)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* cURL snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-slate-500" />
                  <p className="text-[10px] text-slate-600 uppercase tracking-widest">cURL Example</p>
                </div>
                <button
                  onClick={() => copy(curlSnippet, setCopiedCurl)}
                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {copiedCurl
                    ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                    : <><Copy className="w-3 h-3" /><span>Copy</span></>
                  }
                </button>
              </div>
              <pre className="bg-black/40 border border-white/[0.06] rounded-lg px-3 py-3 font-mono text-[11px] text-slate-400 leading-relaxed overflow-x-auto whitespace-pre">
{`curl -X GET "${API_ENDPOINT}" \\
  -H "api-key: ${user.apiKey.slice(0, 8)}••••••••"`}
              </pre>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}