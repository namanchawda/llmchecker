"use client";

import { useMemo } from "react";

function formatDuration(start: string, end?: string) {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();

  const diff = Math.floor((e - s) / 1000);

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);

  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;

  const h = Math.floor(diff / 60);
  return `${h}h ago`;
}

export function CustomIncidentTimeline({ incidents }: any) {
  const sorted = useMemo(
    () =>
      [...(incidents || [])].sort(
        (a, b) =>
          new Date(b.startedAt).getTime() -
          new Date(a.startedAt).getTime(),
      ),
    [incidents],
  );

  if (!sorted.length) {
    return (
      <div className="text-xs text-slate-400">
        No incidents recorded
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* vertical line */}
      <div className="bg-white absolute left-2 top-0 bottom-0 w-px " />

      <div className="flex flex-col gap-4">
        {sorted.map((inc: any) => {
          const ongoing = !inc.resolvedAt;
          const duration = formatDuration(
            inc.startedAt,
            inc.resolvedAt,
          );

          return (
            <div
              key={inc.id}
              className="relative bg-slate-800 border border-slate-700 rounded-lg p-3"
            >
              {/* timeline dot */}
              <div
                className={`absolute -left-[9px] top-4 w-3 h-3 rounded-full ${
                  ongoing
                    ? "bg-red-500 animate-pulse"
                    : "bg-green-500"
                }`}
              />

              {/* header */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">
                  Incident
                </div>

                <div
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    ongoing
                      ? "bg-red-500/20 text-red-400"
                      : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {ongoing ? "ONGOING" : "RESOLVED"}
                </div>
              </div>

              {/* times */}
              <div className="mt-2 text-xs text-slate-300">
                Started:{" "}
                {new Date(inc.startedAt).toLocaleString()} (
                {timeAgo(inc.startedAt)})
              </div>

              {inc.resolvedAt && (
                <div className="text-xs text-slate-300">
                  Resolved:{" "}
                  {new Date(inc.resolvedAt).toLocaleString()} (
                  {timeAgo(inc.resolvedAt)})
                </div>
              )}

              {/* duration */}
              <div className="mt-2 text-xs text-slate-400">
                Duration: {duration}
              </div>

              {/* error info */}
              {inc.startErrorType && (
                <div className="mt-1 text-xs text-red-400">
                  Error: {inc.startErrorType}
                </div>
              )}

              {inc.startHttpStatus && (
                <div className="text-xs text-slate-400">
                  HTTP: {inc.startHttpStatus}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}