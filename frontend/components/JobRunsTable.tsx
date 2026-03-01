export function JobRunsTable({ runs }: any) {
  return (
    <div className="w-full">

      {/* HEADER */}
      <div
        className="
          grid
          grid-cols-[80px_120px_220px_100px_200px]
          gap-4
          px-4 py-3
          text-xs uppercase tracking-wider
          text-slate-400
          border-b border-white/10
          bg-white/[0.02]
        "
      >
      <div className="text-center">Success</div>
        <div>Response Time</div>
        <div>Error</div>
        <div>HTTP</div>
        <div>Created At</div>
      </div>

      {/* ROWS */}
      {runs.map((r: any) => (
        <div
          key={r.id}
          className="
            grid
            grid-cols-[80px_120px_220px_100px_200px]
            gap-4
            px-4 py-4
            items-center
            border-b border-white/5
            odd:bg-white/[0.01]
            hover:bg-white/[0.04]
            transition
            text-sm
          "
        >
          {/* SUCCESS */}
          <div className="text-center">
            {r.success ? "✅" : "❌"}
          </div>

          {/* RESPONSE TIME */}
          <div className="tabular-nums whitespace-nowrap">
            {r.responseTimeMs ?? "-"} ms
          </div>

          {/* ERROR */}
          <div
            className="
              truncate
              whitespace-nowrap
              text-slate-200
            "
            title={r.errorType ?? ""}
          >
            {r.errorType ?? "-"}
          </div>

          {/* HTTP */}
          <div className="tabular-nums whitespace-nowrap">
            {r.httpStatus ?? "-"}
          </div>

          {/* CREATED AT */}
          <div className="whitespace-nowrap text-slate-300">
            {new Date(r.createdAt).toLocaleString('en-IN')}
          </div>
        </div>
      ))}
    </div>
  );
}