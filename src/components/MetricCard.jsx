export default function MetricCard({ label, value, tone = "default" }) {
  return (
    <section className={`metric-card falaj-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
