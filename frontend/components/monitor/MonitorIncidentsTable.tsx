"use client";

export function MonitorIncidentsTable({ incidents }: { incidents: any[] }) {
  if (!incidents.length) {
    return <div className="text-slate-400">No incidents</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-slate-400 border-b border-slate-800">
        <tr>
          <th className="text-left py-2">Scheduler</th>
          <th className="text-left py-2">Started</th>
          <th className="text-left py-2">Resolved</th>
          <th className="text-left py-2">Duration</th>
        </tr>
      </thead>

      <tbody>
        {incidents.map((i) => {
          const duration =
            i.resolvedAt && i.startedAt
              ? Math.round(
                  (new Date(i.resolvedAt).getTime() -
                    new Date(i.startedAt).getTime()) /
                    1000
                )
              : null;

          return (
            <tr
              key={i.id}
              className="border-b border-slate-800 text-slate-300"
            >
              <td className="py-2">{i.jobId}</td>
              <td>{new Date(i.startedAt).toLocaleString()}</td>
              <td>
                {i.resolvedAt
                  ? new Date(i.resolvedAt).toLocaleString()
                  : "Ongoing"}
              </td>
              <td>{duration ? `${duration}s` : "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}