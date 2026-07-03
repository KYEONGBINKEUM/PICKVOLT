import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ReasonCard {
  score: number
  title: string
  body: string
  bars: { label: string; value: number }[]
}

const MOCK_REASONS: ReasonCard[] = [
  {
    score: 98,
    title: 'imaging excellence',
    body: 'The Pixel 8 Pro outperforms the S24 Ultra and iPhone 15 Pro in Real Tone processing. Our analysis of 500+ sample shots shows a 15% lower delta-E in varied lighting conditions, aligning perfectly with your portrait priority.',
    bars: [
      { label: 'pixel', value: 98 },
      { label: 's24 u', value: 72 },
      { label: 'iphone', value: 85 },
    ],
  },
  {
    score: 89,
    title: 'software purity',
    body: "Google's \"Pixel UI\" contains 0 third-party duplicate apps compared to Samsung's 12. For a user who \"hates bloatware,\" the Pixel provides the cleanest interaction model and immediate OS updates.",
    bars: [
      { label: 'pixel', value: 89 },
      { label: 's24 u', value: 48 },
      { label: 'iphone', value: 78 },
    ],
  },
  {
    score: 92,
    title: 'price to value',
    body: 'At $899, the Pixel 8 Pro is $300 cheaper than the S24 Ultra while delivering superior photography in your core use-case. The marginal loss in peak processing power does not justify the 33% price increase for your needs.',
    bars: [
      { label: 'pixel', value: 92 },
      { label: 's24 u', value: 58 },
      { label: 'iphone', value: 74 },
    ],
  },
]

const USER_PRIORITIES = [
  { label: 'photography', value: 90 },
  { label: 'software', value: 75 },
  { label: 'price value', value: 45 },
]

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 w-10 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function PrioritySlider({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="relative h-1.5 bg-white/10 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-accent rounded-full"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-white/20"
          style={{ left: `calc(${value}% - 7px)` }}
        />
      </div>
    </div>
  )
}

export default function ReasoningPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* Back */}
        <Link
          href="/compare"
          className="inline-flex items-center gap-2 text-white/30 hover:text-white text-xs mb-10 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          back to comparison
        </Link>

        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-12">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">detailed analysis</p>
            <h1 className="text-5xl font-black text-white leading-none">why it won.</h1>
          </div>

          {/* Winner card */}
          <div className="bg-gradient-to-br from-[#FF6B2B] via-accent to-[#cc3300] rounded-card px-7 py-5 flex items-center justify-between gap-12 min-w-[340px]">
            <div>
              <p className="text-xs text-black/60 mb-1">top recommended</p>
              <p className="text-2xl font-black text-black">pixel 8 pro</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-black/60 mb-1">overall score</p>
              <p className="text-4xl font-black text-black">94.2</p>
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid md:grid-cols-[280px_1fr] gap-5">

          {/* Left: user priorities */}
          <div className="bg-surface border border-border rounded-card p-6">
            <h3 className="text-sm font-black text-white mb-6">user priorities</h3>

            {USER_PRIORITIES.map((p) => (
              <PrioritySlider key={p.label} label={p.label} value={p.value} />
            ))}

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs text-white/30 mb-2">ai model: pickvolt-v4</p>
              <p className="text-xs text-white/40 leading-relaxed">
                The weights above were derived from your natural language search: &quot;I need the best camera for portraits and hate bloatware.&quot;
              </p>
            </div>
          </div>

          {/* Right: reason cards */}
          <div className="space-y-4">
            {MOCK_REASONS.map((reason) => (
              <div key={reason.title} className="bg-surface border border-border rounded-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-black text-accent">{reason.score}</span>
                  <span className="text-lg font-black text-white">{reason.title}</span>
                </div>
                <p className="text-sm text-white/50 leading-relaxed mb-5">{reason.body}</p>
                <div className="space-y-2">
                  {reason.bars.map((b) => (
                    <MiniBar key={b.label} label={b.label} value={b.value} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white">pickvolt</span>
          </div>
          <p className="text-xs text-white/20">© 2024 pickvolt. ai decisions made transparent.</p>
        </div>
      </footer>

      {/* Right sidebar */}
      <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-surface-2 border border-border rounded-l-xl px-2 py-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            ai logic & criteria weights
          </p>
        </div>
      </div>
    </>
  )
}
