import { Suspense } from 'react'
import CompareClient from './CompareClient'

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareLoading />}>
      <CompareClient />
    </Suspense>
  )
}

function CompareLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-white/40">loading comparison...</p>
      </div>
    </div>
  )
}
