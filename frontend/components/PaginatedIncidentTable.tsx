"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h ago`;
}

function formatDuration(startedAt: string, resolvedAt?: string) {
  const s = new Date(startedAt).getTime();
  const e = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diff = Math.floor((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

type Incident = {
  id: string;
  startedAt: string;
  resolvedAt?: string;
  startErrorType?: string;
  startHttpStatus?: number;
  jobId?: string;
  jobPrompt?: string; // enriched on incidents tab
};

type Props = {
  incidents: Incident[];
  pageSize?: number;
  showJobName?: boolean; // for the all-incidents tab
};

export function PaginatedIncidentTable({
  incidents,
  pageSize = 10,
  showJobName = false,
}: Props) {
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const ongoing = [...incidents]
      .filter((i) => !i.resolvedAt)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const resolved = [...incidents]
      .filter((i) => !!i.resolvedAt)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return [...ongoing, ...resolved];
  }, [incidents]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // reset to page 1 if incidents list changes
  useMemo(() => setPage(1), [incidents]);

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-800/20 rounded-xl border border-slate-800">
        <span className="text-3xl mb-3">👍</span>
        <div className="text-sm font-semibold text-white">Good job, no incidents.</div>
        <div className="text-xs text-slate-500 mt-1">No incidents so far. Keep it up!</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div
  className={`grid gap-0 px-4 py-2.5 bg-slate-800/70 text-[10px] uppercase tracking-widest text-slate-500 ${
    showJobName
      ? "grid-cols-[16px_1.2fr_110px_90px_1fr_70px_110px]"
      : "grid-cols-[16px_120px_90px_1fr_80px_120px]"
  }`}
>
          <div />
          {showJobName && <div>Scheduler</div>}
          <div>Started</div>
          <div>Duration</div>
          <div>Error</div>
          <div>HTTP</div>
          <div>Resolved</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/60">
          {paginated.map((inc) => {
            const ongoing = !inc.resolvedAt;
            return (
              <div
                key={inc.id}
                className={`grid gap-0 px-4 py-3 items-center text-sm hover:bg-slate-800/30 transition-colors ${
  showJobName
    ? "grid-cols-[16px_1.2fr_110px_90px_1fr_70px_110px]"
    : "grid-cols-[16px_120px_90px_1fr_80px_120px]"
}`}
              >
                {/* status dot */}
                <div className="flex items-center justify-center">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      ongoing
                        ? "bg-red-500 animate-pulse"
                        : "bg-green-500"
                    }`}
                  />
                </div>

                {/* job name (incidents tab only) */}
{showJobName && (
  <div className="relative group pr-3">
    {/* truncated text */}
    <div className="text-xs text-slate-300 truncate font-medium cursor-default">
      {inc.jobPrompt
        ? inc.jobPrompt
        : inc.jobId?.slice(0, 8) + "…"}
    </div>

    {/* hover popup */}
    {(inc.jobPrompt || inc.jobId) && (
      <div className="pointer-events-none absolute left-0 bottom-full mb-1 hidden group-hover:block z-50">
        <div className="max-w-[320px] whitespace-normal break-words rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 shadow-xl">
          {inc.jobPrompt || inc.jobId}
        </div>
      </div>
    )}
  </div>
)}

                {/* started */}
                <div className="text-xs">
                  <div className="text-white font-medium">
                    {new Date(inc.startedAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="text-slate-500">
                    {new Date(inc.startedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {/* duration */}
                <div className="text-xs text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  {formatDuration(inc.startedAt, inc.resolvedAt)}
                  {ongoing && (
                    <span className="text-[9px] text-red-400 font-semibold">
                      LIVE
                    </span>
                  )}
                </div>

                {/* error type */}
                <div
                  className="text-xs min-w-0 break-all pr-1"
                  title={inc.startErrorType ?? ""}
                >
                  {inc.startErrorType ? (
                    <span className="text-red-400">{inc.startErrorType}</span>
                  ) : (
                    <span className="text-slate-600">–</span>
                  )}
                </div>

                {/* http status */}
                <div className="text-xs tabular-nums">
                  {inc.startHttpStatus ? (
                    <span
                      className={
                        inc.startHttpStatus >= 500
                          ? "text-red-400"
                          : inc.startHttpStatus >= 400
                          ? "text-orange-400"
                          : "text-slate-400"
                      }
                    >
                      {inc.startHttpStatus}
                    </span>
                  ) : (
                    <span className="text-slate-600">–</span>
                  )}
                </div>

                {/* resolved */}
                <div className="text-xs">
                  {ongoing ? (
                    <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                      Ongoing
                    </span>
                  ) : (
                    <div>
                      <div className="text-slate-300">
                        {new Date(inc.resolvedAt!).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                      <div className="text-slate-500">
                        {new Date(inc.resolvedAt!).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-500">
            Showing{" "}
            <span className="text-white font-medium">
              {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, sorted.length)}
            </span>{" "}
            of <span className="text-white font-medium">{sorted.length}</span>{" "}
            incidents
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-600 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                      page === p
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}