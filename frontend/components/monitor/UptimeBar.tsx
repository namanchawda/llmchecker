"use client";

export function UptimeBar({ runs }: { runs: any[] }) {
  const last = runs.slice(0, 30); // last 30 checks

  return (
    <div className="flex gap-[2px]">
      {last.map((r, i) => (
        <div
          key={i}
          className={`w-[4px] h-4 rounded ${
            r.success ? "bg-green-500" : "bg-red-500"
          }`}
        />
      ))}
    </div>
  );
}