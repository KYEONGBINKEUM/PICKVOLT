import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { Check, X, Zap } from 'lucide-react'

const FREE_FEATURES = [
  '3 comparisons per day',
  'basic spec matching',
  '7-day history storage',
]
const FREE_MISSING = ['no pdf exports']

const PRO_FEATURES = [
  'unlimited daily comparisons',
  'ai deep dives & reasoning',
  'lifetime history syncing',
  'one-click pdf & sheet exports',
  'exclusive early feature access',
]

const TABLE_ROWS = [
  { label: 'daily comparisons', free: '3 per day', pro: 'unlimited', proHighlight: true },
  { label: 'ai reasoning engine', free: 'basic', pro: 'advanced neural', proHighlight: true },
  { label: 'export formats', free: '—', pro: 'pdf, csv, sheets', proHighlight: false },
  { label: 'search priority', free: 'standard', pro: 'priority', proHighlight: false },
  { label: 'product alerts', free: '—', pro: 'unlimited', proHighlight: false },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            power your choice.
          </h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            upgrade to pickvolt pro for advanced analytics, unlimited comparisons,
            and ai-driven insights that help you buy with confidence.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-14">
          {/* Free */}
          <div className="bg-surface border border-border rounded-card p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1">standard version</p>
              <p className="text-lg font-black text-white mb-4">free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-white/30 text-sm mb-2">/ forever</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                  <Check className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                  {f}
                </li>
              ))}
              {FREE_MISSING.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/30">
                  <X className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button className="w-full border border-border text-white/50 font-semibold py-3 rounded-full text-sm">
              current plan
            </button>
          </div>

          {/* Pro */}
          <div className="relative bg-surface border-2 border-accent/40 rounded-card p-7 flex flex-col overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-accent uppercase tracking-widest">full access</p>
                <span className="flex items-center gap-1 text-[10px] font-black tracking-widest bg-accent text-white rounded-full px-2.5 py-1 uppercase">
                  <Zap className="w-2.5 h-2.5" />
                  popular
                </span>
              </div>
              <p className="text-lg font-black text-white mb-4">pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$12</span>
                <span className="text-white/30 text-sm mb-2">/ month</span>
              </div>
            </div>

            <ul className="relative space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button className="relative w-full bg-accent hover:bg-accent-light text-white font-bold py-3 rounded-full text-sm transition-colors shadow-lg shadow-accent/20">
              upgrade to pro
            </button>
          </div>
        </div>

        {/* Feature table */}
        <div>
          <div className="mb-5">
            <h2 className="text-sm font-black text-white">compare the tiers</h2>
            <p className="text-xs text-white/30">side by side</p>
          </div>

          <div className="bg-surface border border-border rounded-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-border">
              <span className="text-xs text-white/40 font-semibold uppercase tracking-widest">feature</span>
              <span className="text-xs text-white/40 font-semibold uppercase tracking-widest text-center">free</span>
              <span className="text-xs text-accent font-semibold uppercase tracking-widest text-center">pro</span>
            </div>

            {TABLE_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_120px_120px] px-6 py-4 items-center ${
                  i !== TABLE_ROWS.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="text-sm text-white/60">{row.label}</span>
                <span className="text-sm text-white/40 text-center">{row.free}</span>
                <span className={`text-sm text-center font-semibold ${row.proHighlight ? 'text-accent' : 'text-white/70'}`}>
                  {row.pro}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-10">
          powered by <span className="text-white/30">polar.sh</span> · cancel anytime · no hidden fees
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white">pickvolt</span>
          </div>
          <div className="flex gap-6 text-xs text-white/30">
            <a href="#" className="hover:text-white transition-colors">privacy</a>
            <a href="#" className="hover:text-white transition-colors">terms</a>
            <a href="#" className="hover:text-white transition-colors">api</a>
            <a href="#" className="hover:text-white transition-colors">contact</a>
          </div>
          <p className="text-xs text-white/20">© 2024 pickvolt. numbers are cool, but how do they make you feel?</p>
        </div>
      </footer>

      {/* Right sidebar */}
      <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-surface-2 border border-border rounded-l-xl px-2 py-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            unlock full potential
          </p>
        </div>
      </div>
    </>
  )
}
