export function LatestRun({ run }: any) {
  if (!run) return null;

  return (
    <div>
      <h3>Latest Run</h3>
      <div>Status: {run.success ? '✅ OK' : '❌ FAIL'}</div>
      <div>Response Time: {run.responseTimeMs} ms</div>
      <div>Response: {run.responseText}</div>
    </div>
  );
}