'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Share2, ChevronRight, RotateCcw, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PerformanceBar from '@/components/PerformanceBar'

interface ProductSpecs {
  cpu?: string | null
  cpuSpeedMHz?: number | null
  performanceScore?: number | null
  ram?: string | null
  storage?: string | null
  display?: string | null
  camera?: string | null
  batteryCapacity?: string | null
  batteryLife?: string | null
  os?: string | null
  weight?: string | null
  weightG?: number | null
  ipRating?: string | null
}

interface Product {
  id: string
  name: string
  brand: string
  category: string
  specs: ProductSpecs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

interface AiResult {
  winner: string
  summary: string
  reasoning: string
  scores?: Record<string, { value: number; reason: string }>
}

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
      <div className="aspect-[4/3] rounded-xl bg-surface-2 border border-border mb-4 overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-xs text-white/30 mb-1">{product.brand}</p>
          <p className="text-xs text-white/20">{product.category}</p>
        </div>
      </div>
      <Link
        href={`/product/${product.id}`}
        className="text-base font-bold text-white hover:text-accent transition-colors"
      >
        {product.name}
      </Link>
      {product.specs.os && (
        <p className="text-white/40 text-xs mt-1">{product.specs.os}</p>
      )}
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
    <div
      className="grid border-t border-border"
      style={{ gridTemplateColumns: `160px repeat(${values.length}, 1fr)` }}
    >
      <div className="p-4 flex flex-col gap-0.5">
        <span className="text-xs text-white/40">{sublabel}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
      {values.map((v, i) => (
        <div key={i} className="p-4 border-l border-border">
          <span className="text-2xl font-black text-white break-words leading-tight">{v.primary}</span>
          {v.secondary && <p className="text-xs text-white/40 mt-1">{v.secondary}</p>}
          {v.bar !== undefined && <PerformanceBar score={v.bar} />}
        </div>
      ))}
    </div>
  )
}

/* ---------- Reasoning Modal ---------- */
function ReasoningModal({
  aiResult,
  products,
  onClose,
}: {
  aiResult: AiResult
  products: Product[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 border border-border rounded-card p-8 max-w-lg w-full animate-slide-up overflow-y-auto max-h-[80vh]"
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
        <h3 className="text-xl font-black text-white mb-4">
          why {aiResult.winner} wins
        </h3>
        <p className="text-sm text-white/60 leading-relaxed mb-6">{aiResult.reasoning}</p>

        {aiResult.scores && (
          <div className="space-y-3">
            {products.map((p) => {
              const scoreKey = Object.keys(aiResult.scores!).find(
                (k) => k.toLowerCase().includes(p.name.split(' ').slice(-1)[0].toLowerCase())
              ) ?? p.name
              const score = aiResult.scores![scoreKey]
              if (!score) return null
              return (
                <div key={p.id} className="bg-surface rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className="text-accent font-bold">{score.value}</span>
                  </div>
                  <p className="text-xs text-white/40">{score.reason}</p>
                  <PerformanceBar score={score.value} />
                </div>
              )
            })}
          </div>
        )}

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

/* ---------- Loading State ---------- */
function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  )
}

/* ---------- Sidebar Toggle ---------- */
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
  const router = useRouter()
  const idsParam = searchParams.get('ids') ?? ''

  const [navSearch, setNavSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('searching products...')
  const [error, setError] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)

  const runComparison = useCallback(async (ids: string[]) => {
    if (ids.length < 2) return

    setLoading(true)
    setError(null)
    setProducts([])
    setAiResult(null)

    try {
      // 1. 각 ID로 상세 스펙 가져오기
      setLoadingMsg('fetching specs...')
      const details = await Promise.all(
        ids.map((id) => fetch(`/api/products/${id}`).then((r) => r.json()))
      )

      const validProducts = details.filter((d) => d.id && !d.error)
      if (validProducts.length < 2) {
        setError('제품 스펙을 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      setProducts(validProducts)

      // 2. AI 비교 실행
      setLoadingMsg('running AI comparison...')
      const compareRes = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: validProducts.map((p) => ({
            name: p.name,
            specs: {
              cpu: p.specs.cpu,
              ram: p.specs.ram,
              storage: p.specs.storage,
              display: p.specs.display,
              camera: p.specs.camera,
              battery: p.specs.batteryCapacity,
              batteryLife: p.specs.batteryLife,
              os: p.specs.os,
              weight: p.specs.weight,
              ipRating: p.specs.ipRating,
            },
          })),
        }),
      })

      const compareData = await compareRes.json()
      if (compareData.error) {
        setError(compareData.error)
      } else {
        setAiResult(compareData)
      }
    } catch {
      setError('비교에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length >= 2) {
      runComparison(ids)
    }
  }, [idsParam, runComparison])

  const handleNavSearch = (v: string) => {
    if (v.trim()) {
      router.push(`/compare?q=${encodeURIComponent(v.trim())}`)
    }
  }

  // 스펙 로우 데이터 생성
  type SpecRowData = { label: string; sublabel: string; values: { primary: string | number; secondary?: string; bar?: number }[] }
  const specRows: SpecRowData[] = products.length > 0
    ? ([
        products[0].specs.performanceScore !== null && {
          label: 'performance',
          sublabel: 'benchmark score',
          values: products.map((p) => ({
            primary: p.specs.performanceScore ?? '—',
            secondary: p.specs.cpu ?? undefined,
            bar: p.specs.performanceScore ?? undefined,
          })),
        },
        products[0].specs.ram !== null && {
          label: 'RAM',
          sublabel: 'memory',
          values: products.map((p) => ({ primary: p.specs.ram ?? '—' })),
        },
        products[0].specs.storage !== null && {
          label: 'storage',
          sublabel: 'internal',
          values: products.map((p) => ({ primary: p.specs.storage ?? '—' })),
        },
        products[0].specs.batteryCapacity !== null && {
          label: 'battery',
          sublabel: 'capacity',
          values: products.map((p) => ({
            primary: p.specs.batteryCapacity ?? '—',
            secondary: p.specs.batteryLife ?? undefined,
          })),
        },
        products[0].specs.camera !== null && {
          label: 'camera',
          sublabel: 'main sensor',
          values: products.map((p) => ({ primary: p.specs.camera ?? '—' })),
        },
        products[0].specs.display !== null && {
          label: 'display',
          sublabel: 'screen',
          values: products.map((p) => ({ primary: p.specs.display ?? '—' })),
        },
      ] as (SpecRowData | false)[]).filter((r): r is SpecRowData => !!r)
    : []

  return (
    <>
      <Navbar
        showSearch
        searchValue={navSearch}
        onSearchChange={setNavSearch}
        onSearchSubmit={handleNavSearch}
        searchPlaceholder='e.g. "iphone 15 pro vs s24 ultra"'
      />

      <main className="min-h-screen bg-background pt-20 pb-20 px-4 md:px-6 max-w-inner mx-auto">

        {/* 검색 힌트 (제품 없을 때) */}
        {!idsParam && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-white/40 text-sm">비교할 제품을 검색해서 트레이에 담아주세요</p>
            <p className="text-white/20 text-xs">우측 하단 트레이에 2개 이상 담으면 비교가 시작됩니다</p>
          </div>
        )}

        {/* 로딩 */}
        {loading && <LoadingState message={loadingMsg} />}

        {/* 에러 */}
        {error && !loading && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-card text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 결과 */}
        {!loading && products.length >= 2 && (
          <div className="mt-8">
            {/* AI Pick Banner */}
            {aiResult && (
              <AIPickBanner
                winner={aiResult.winner}
                reasoning={aiResult.summary}
                onViewReasoning={() => setShowReasoning(true)}
              />
            )}

            {/* 비교 테이블 */}
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-8">
              {/* 헤더 */}
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}
              >
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

              {/* 스펙 로우 */}
              {specRows.map((row) => (
                <SpecRow
                  key={row.label}
                  label={row.label}
                  sublabel={row.sublabel}
                  values={row.values}
                />
              ))}
            </div>

            {/* 액션 버튼 */}
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

            {/* 히스토리 섹션 (placeholder) */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-black text-white">comparison history</h3>
                <span className="text-xs text-white/30">last 30 days</span>
              </div>
              <div className="p-6 bg-surface border border-border rounded-card text-center">
                <p className="text-white/20 text-sm">sign in to save your comparison history</p>
                <Link
                  href="/login"
                  className="mt-3 inline-block text-xs font-semibold text-accent hover:text-accent-light transition-colors"
                >
                  sign in →
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 리즈닝 모달 */}
      {showReasoning && aiResult && (
        <ReasoningModal
          aiResult={aiResult}
          products={products}
          onClose={() => setShowReasoning(false)}
        />
      )}

      {/* 재비교 버튼 */}
      {!loading && products.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            new comparison
          </button>
        </div>
      )}

      <SidebarToggle />
    </>
  )
}
