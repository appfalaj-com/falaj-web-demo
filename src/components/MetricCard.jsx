export default function MetricCard({ label, value, tone = "default" }) {
  return (
    <section className={`metric-card falaj-card ${tone}`}>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </section>
  );
}
