"use client";

import { UptimeBar } from "./UptimeBar";

type Props = {
  jobs: any[];
  runsMap: Record<string, any[]>;
  statusMap: Record<string, any>;
  onSelect: (id: string) => void;
};

export function MonitorSchedulerList({
  jobs,
  runsMap,
  statusMap,
  onSelect,
}: Props) {
  if (!jobs.length) {
    return <div className="text-slate-400">No schedulers</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job) => {
        const status = statusMap[job.id];
        const runs = runsMap[job.id] ?? [];

        const isUp = status?.success === true;

        return (
          <div
            key={job.id}
            onClick={() => onSelect(job.id)}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-800"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white text-sm font-medium">
                  {job.prompt.slice(0, 50)}
                </div>

                <div className="text-xs text-slate-400">
                  every {job.intervalSeconds}s
                </div>
              </div>

              <div
                className={`text-xs px-2 py-1 rounded ${
                  isUp
                    ? "bg-green-600/20 text-green-400"
                    : "bg-red-600/20 text-red-400"
                }`}
              >
                {isUp ? "UP" : "DOWN"}
              </div>
            </div>

            <div className="mt-3">
              <UptimeBar runs={runs} />
            </div>
          </div>
        );
      })}
    </div>
  );
}