// Dependency-free SVG chart: a filled line chart with hover tooltips (via <title>),
// sized to its container. `labels` are ISO dates (YYYY-MM-DD), `values` are counts.
export default function MiniChart({ labels, values, color = "#AB812E", height = 120, title }) {
  const w = 600;
  const pad = { l: 28, r: 8, t: 8, b: 20 };
  const max = Math.max(1, ...values);
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const n = values.length;
  const x = (i) => pad.l + (n <= 1 ? 0 : (i * (w - pad.l - pad.r)) / (n - 1));
  const y = (v) => pad.t + (1 - v / niceMax) * (height - pad.t - pad.b);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const total = values.reduce((a, b) => a + b, 0);
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto" role="img" aria-label={`${title}: ${total} in the last ${n} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.12" />
            <text x={pad.l - 4} y={y(t) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity="0.55">{Math.round(t)}</text>
          </g>
        ))}
        <path d={area} fill={color} fillOpacity="0.15" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={n > 40 ? 2 : 3} fill={color}>
            <title>{`${labels[i]}: ${v}`}</title>
          </circle>
        ))}
        <text x={pad.l} y={height - 5} fontSize="9" fill="currentColor" fillOpacity="0.55">{labels[0]?.slice(5)}</text>
        <text x={w - pad.r} y={height - 5} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity="0.55">{labels[n - 1]?.slice(5)}</text>
      </svg>
    </figure>
  );
}
