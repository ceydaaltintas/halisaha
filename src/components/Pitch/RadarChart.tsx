export function RadarChart({
  labels,
  seriesA,
  seriesB,
  colorA,
  colorB,
}: {
  labels: string[]
  seriesA: number[]
  seriesB: number[]
  colorA: string
  colorB: string
}) {
  const n = labels.length
  const center = 50
  const radius = 36

  function point(i: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (Math.max(0, value) / 99) * radius
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  function labelPoint(i: number): [number, number] {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = radius + 10
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  function toPoints(series: number[]): string {
    return series.map((v, i) => point(i, v).join(',')).join(' ')
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-auto">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={Array.from({ length: n }, (_, i) => point(i, 99 * f).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={0.4}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = point(i, 99)
        return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={0.4} />
      })}
      <polygon points={toPoints(seriesA)} fill={`${colorA}55`} stroke={colorA} strokeWidth={1} />
      <polygon points={toPoints(seriesB)} fill={`${colorB}55`} stroke={colorB} strokeWidth={1} />
      {labels.map((label, i) => {
        const [x, y] = labelPoint(i)
        return (
          <text key={label} x={x} y={y} fontSize={6} fill="white" textAnchor="middle" dominantBaseline="middle">
            {label}
          </text>
        )
      })}
    </svg>
  )
}
