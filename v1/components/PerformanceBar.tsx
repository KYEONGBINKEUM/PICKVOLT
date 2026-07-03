'use client'

import { useEffect, useState } from 'react'

interface PerformanceBarProps {
  score: number
  max?: number
  color?: string
}

export default function PerformanceBar({ score, max = 100, color }: PerformanceBarProps) {
  const [width, setWidth] = useState(0)
  const pct = Math.round((score / max) * 100)

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-3">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color ?? '#FF6B2B' }}
      />
    </div>
  )
}
