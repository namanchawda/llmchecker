type Props = {
  label: string;
  value: string | number;
  hint?: string;
};

export function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="card card--metric">
      <div className="muted">{label}</div>
      <div className="metric-value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
