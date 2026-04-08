'use client'

export interface RadarDimension {
  label: string
  score: number // 0–100
}

export interface RadarProduct {
  name: string
  color: string
  dimensions: RadarDimension[]
}

interface RadarChartProps {
  products: RadarProduct[]
  size?: number
}

export default function RadarChart({ products, size = 280 }: RadarChartProps) {
  if (!products.length || !products[0].dimensions.length) return null

  const labels = products[0].dimensions.map((d) => d.label)
  const n = labels.length
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.33        // 100% radius
  const labelR = size * 0.455  // label distance from center

  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2

  const pt = (i: number, pct: number) => {
    const a = angle(i)
    const d = r * (pct / 100)
    return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) }
  }

  const toPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  const gridLevels = [25, 50, 75, 100]

  // Determine text-anchor based on position relative to center
  const textAnchor = (i: number): 'start' | 'middle' | 'end' => {
    const a = angle(i)
    const x = Math.cos(a)
    if (x < -0.1) return 'end'
    if (x > 0.1) return 'start'
    return 'middle'
  }

  // Small vertical offset so labels don't clip axis
  const labelDY = (i: number): number => {
    const a = angle(i)
    const y = Math.sin(a)
    if (y < -0.1) return -4
    if (y > 0.1) return 12
    return 4
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      {/* Grid rings */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: n }, (_, i) => {
            const p = pt(i, level)
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      ))}

      {/* Axis spokes */}
      {Array.from({ length: n }, (_, i) => {
        const outer = pt(i, 100)
        return (
          <line
            key={i}
            x1={cx.toFixed(1)} y1={cy.toFixed(1)}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        )
      })}

      {/* Product polygons */}
      {products.map((product, pi) => {
        const pts = product.dimensions.map((dim, i) => pt(i, Math.max(dim.score, 2)))
        return (
          <g key={pi}>
            <path
              d={toPath(pts)}
              fill={product.color}
              fillOpacity={0.12}
              stroke={product.color}
              strokeWidth="1.5"
              strokeOpacity={0.85}
              strokeLinejoin="round"
            />
            {pts.map((p, i) => (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r="3"
                fill={product.color}
                fillOpacity={0.9}
              />
            ))}
          </g>
        )
      })}

      {/* Axis labels */}
      {labels.map((label, i) => {
        const a = angle(i)
        const lx = cx + labelR * Math.cos(a)
        const ly = cy + labelR * Math.sin(a)
        return (
          <text
            key={i}
            x={lx.toFixed(1)}
            y={(ly + labelDY(i)).toFixed(1)}
            textAnchor={textAnchor(i)}
            fill="rgba(255,255,255,0.45)"
            fontSize="9.5"
            fontWeight="600"
            letterSpacing="0.3"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
