'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Share2, ChevronRight, RotateCcw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PerformanceBar from '@/components/PerformanceBar'

/* ---------- Mock data (replace with real API calls) ---------- */
interface Product {
  id: string
  name: string
  price: string
  image: string
  performance: number
  battery: number
  batteryLabel: string
  optics: number
  opticsLabel: string
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'iphone-15-pro',
    name: 'iphone 15 pro',
    price: '$999.00',
    image: '',
    performance: 98,
    battery: 22,
    batteryLabel: 'mixed usage',
    optics: 48,
    opticsLabel: 'megapixels',
  },
  {
    id: 'pixel-8-pro',
    name: 'pixel 8 pro',
    price: '$899.00',
    image: '',
    performance: 92,
    battery: 20,
    batteryLabel: 'mixed usage',
    optics: 50,
    opticsLabel: 'megapixels',
  },
  {
    id: 's24-ultra',
    name: 's24 ultra',
    price: '$1,199.00',
    image: '',
    performance: 96,
    battery: 24,
    batteryLabel: 'mixed usage',
    optics: 200,
    opticsLabel: 'megapixels',
  },
]

const MOCK_HISTORY = [
  { id: 1, date: 'march 12, 2024', title: 'macbook pro m3 vs dell xps 14', count: 3 },
  { id: 2, date: 'march 10, 2024', title: 'sony wh-1000xm5 vs bose qc ultra', count: 2 },
]

/* ---------- AI Pick Banner ---------- */
function AIPickBanner({
  winner,
  reasoning,
  onViewReasoning,
}: {
  winner: string
  reasoning: string
  onViewReasoning: () => void
}) {
  return (
    <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-[#FF6B2B] via-accent to-[#cc3300] p-8 mb-8">
      <div className="absolute top-4 right-4">
        <span className="text-xs font-bold tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white uppercase">
          AI PICK
        </span>
      </div>

      <div className="max-w-lg">
        <h2 className="text-3xl md:text-4xl font-black text-black leading-tight mb-3">
          the {winner} is your winner.
        </h2>
        <p className="text-black/70 text-sm leading-relaxed mb-6">{reasoning}</p>
        <button
          onClick={onViewReasoning}
          className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors"
        >
          view reasoning
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ---------- Product Card ---------- */
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="flex flex-col">
      {/* Image */}
      <div className="aspect-[4/3] rounded-xl bg-surface-2 border border-border mb-4 overflow-hidden flex items-center justify-center">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/5" />
        )}
      </div>
      <Link
        href={`/product/${product.id}`}
        className="text-base font-bold text-white hover:text-accent transition-colors"
      >
        {product.name}
      </Link>
      <p className="text-accent font-semibold text-sm mt-1">{product.price}</p>
    </div>
  )
}

/* ---------- Spec Row ---------- */
function SpecRow({
  label,
  sublabel,
  values,
}: {
  label: string
  sublabel: string
  values: { primary: string | number; secondary?: string; bar?: number }[]
}) {
  return (
    <div className="grid grid-cols-[160px_1fr_1fr_1fr] border-t border-border">
      {/* Label col */}
      <div className="p-4 flex flex-col gap-0.5">
        <span className="text-xs text-white/40">{sublabel}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>

      {values.map((v, i) => (
        <div key={i} className="p-4 border-l border-border">
          <span className="text-3xl font-black text-white">{v.primary}</span>
          {v.secondary && (
            <p className="text-xs text-white/40 mt-1">{v.secondary}</p>
          )}
          {v.bar !== undefined && <PerformanceBar score={v.bar} />}
        </div>
      ))}
    </div>
  )
}

/* ---------- Reasoning Modal ---------- */
function ReasoningModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 border border-border rounded-card p-8 max-w-lg w-full animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold tracking-widest bg-accent/20 text-accent rounded-full px-3 py-1 uppercase">
            AI Reasoning
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <h3 className="text-xl font-black text-white mb-4">why pixel 8 pro wins</h3>
        <div className="space-y-4 text-sm text-white/60 leading-relaxed">
          <p>
            <span className="text-white font-semibold">photography priority:</span> based on your
            stated preference for photography, the pixel 8 pro&apos;s computational photography
            pipeline outperforms both competitors. natural skin tones and faster shutter speeds make
            it the clear choice.
          </p>
          <p>
            <span className="text-white font-semibold">clean software:</span> pure android with
            guaranteed 7 years of updates means your device stays fast and secure longer than
            alternatives.
          </p>
          <p>
            <span className="text-white font-semibold">value:</span> at $899, it saves $300 vs the
            s24 ultra while matching or exceeding it in your priority categories.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-accent hover:bg-accent-light text-white font-semibold py-3 rounded-full transition-colors text-sm"
        >
          got it
        </button>
      </div>
    </div>
  )
}

/* ---------- Sidebar: side-by-side toggle ---------- */
function SidebarToggle() {
  return (
    <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-surface-2 border border-border rounded-l-xl p-3 cursor-pointer hover:bg-surface transition-colors">
        <p className="text-xs text-white/40 writing-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          compare specs side by side
        </p>
      </div>
    </div>
  )
}

/* ---------- Main ---------- */
export default function CompareClient() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const router = useRouter()
  const [navSearch, setNavSearch] = useState(query)

  const products = MOCK_PRODUCTS
  const winner = products[1] // pixel 8 pro

  return (
    <>
      <Navbar
        showSearch
        searchValue={navSearch}
        onSearchChange={setNavSearch}
      />

      <main className="min-h-screen bg-background pt-20 pb-20 px-4 md:px-6 max-w-inner mx-auto">
        {/* AI Pick Banner */}
        <div className="mt-8">
          <AIPickBanner
            winner={winner.name}
            reasoning={`based on your priority for photography and clean software, the ai recommends the pixel over the s24 ultra for natural skin tones and faster shutter speeds.`}
            onViewReasoning={() => router.push('/reasoning')}
          />
        </div>

        {/* Comparison overview table */}
        <div className="bg-surface border border-border rounded-card overflow-hidden mb-8">
          {/* Header row */}
          <div className="grid grid-cols-[160px_1fr_1fr_1fr] border-b border-border">
            <div className="p-4">
              <p className="text-xs text-white/40 mb-1">comparison overview</p>
              <p className="text-sm font-bold text-white">top choices</p>
            </div>
            {products.map((p) => (
              <div key={p.id} className="p-4 border-l border-border">
                <ProductCard product={p} />
              </div>
            ))}
          </div>

          {/* Spec rows */}
          <SpecRow
            label="performance"
            sublabel="benchmark score"
            values={products.map((p) => ({
              primary: p.performance,
              bar: p.performance,
            }))}
          />
          <SpecRow
            label="battery life"
            sublabel="estimated hours"
            values={products.map((p) => ({
              primary: p.battery,
              secondary: p.batteryLabel,
            }))}
          />
          <SpecRow
            label="optics"
            sublabel="sensor rating"
            values={products.map((p) => ({
              primary: p.optics,
              secondary: p.opticsLabel,
            }))}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 mb-12">
          <button className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20">
            <Download className="w-4 h-4" />
            export as pdf
          </button>
          <button className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20">
            <Share2 className="w-4 h-4" />
            share comparison
          </button>
        </div>

        {/* History section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-black text-white">comparison history</h3>
            <span className="text-xs text-white/30">last 30 days</span>
          </div>
          <div className="space-y-3">
            {MOCK_HISTORY.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-surface border border-border rounded-card hover:border-border/60 transition-colors"
              >
                <div>
                  <p className="text-xs text-white/30 mb-1">{item.date}</p>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/30">{item.count} products compared</span>
                  <button className="flex items-center gap-1.5 bg-surface-2 border border-border text-white/70 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:border-white/20">
                    <RotateCcw className="w-3 h-3" />
                    restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <SidebarToggle />

    </>
  )
}
