'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Share2, ChevronRight, RotateCcw, Loader2, TrendingUp, Lock, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PerformanceBar from '@/components/PerformanceBar'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { shortenCompareTitle } from '@/lib/utils'
import { computeRelativeScores, type CategoryStats } from '@/lib/scoring'
import RadarChart, { type RadarProduct } from '@/components/RadarChart'

interface ProductSpecs {
  cpu?: string | null
  cpuSpeedMHz?: number | null
  performanceScore?: number | null
  gb6Single?: number | null
  gb6Multi?: number | null
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
  image_url?: string | null
  source_url?: string | null
  specs: ProductSpecs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: Record<string, any>
}

interface AiResult {
  winner: string
  summary: string
  reasoning: string
  remaining: number | null
  isPro: boolean
  scores?: Record<string, { value: number; reason: string }>
}

interface PopularItem {
  title: string
  products: string[]
  cnt: number
}

/* ---------- AI Pick Banner ---------- */
function AIPickBanner({
  winner,
  reasoning,
  onViewReasoning,
  t,
}: {
  winner: string
  reasoning: string
  onViewReasoning: () => void
  t: (k: string) => string
}) {
  return (
    <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-[#FF6B2B] via-accent to-[#cc3300] p-8 mb-8">
      <div className="absolute top-4 right-4">
        <span className="text-xs font-bold tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-white uppercase">
          {t('compare.aipick')}
        </span>
      </div>
      <div className="max-w-lg">
        <h2 className="text-3xl md:text-4xl font-black text-black leading-tight mb-3">
          the {winner} {t('compare.winner')}
        </h2>
        <p className="text-black/70 text-sm leading-relaxed mb-6">{reasoning}</p>
        <button
          onClick={onViewReasoning}
          className="inline-flex items-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 transition-colors"
        >
          {t('compare.view_reasoning')}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ---------- Login Gate Banner (AI Pick locked) ---------- */
function AIPickLocked({ t }: { t: (k: string) => string }) {
  return (
    <div className="relative rounded-card overflow-hidden border border-border bg-surface p-8 mb-8 flex items-center gap-6">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
        <Lock className="w-5 h-5 text-white/30" />
      </div>
      <div className="flex-1">
        <p className="text-white font-bold mb-1">AI Pick is available for members</p>
        <p className="text-white/40 text-sm">Sign in to see which product wins and why.</p>
      </div>
      <Link
        href="/login"
        className="flex-shrink-0 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
      >
        {t('auth.signin')}
      </Link>
    </div>
  )
}

/* ---------- Product Card ---------- */
function ProductCard({ product }: { product: Product }) {
  const imgSrc = product.image_url ?? null
  const sourceDomain = product.source_url
    ? new URL(product.source_url).hostname.replace('www.', '')
    : product.brand.toLowerCase() + '.com'

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] rounded-xl bg-surface-2 border border-border mb-4 overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-4"
            />
            <span className="absolute bottom-1.5 right-2 text-[9px] text-white/20 leading-none">
              © {sourceDomain}
            </span>
          </>
        ) : (
          <div className="text-center p-4">
            <p className="text-xs text-white/30 mb-1">{product.brand}</p>
            <p className="text-xs text-white/20">{product.category}</p>
          </div>
        )}
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
  barMax = 100,
}: {
  label: string
  sublabel: string
  values: { primary: string | number; secondary?: string; bar?: number }[]
  barMax?: number
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
          {v.bar !== undefined && <PerformanceBar score={v.bar} max={barMax} />}
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
  t,
}: {
  aiResult: AiResult
  products: Product[]
  onClose: () => void
  t: (k: string) => string
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
            {t('compare.ai_reasoning')}
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg">✕</button>
        </div>

        <h3 className="text-2xl font-black text-white mb-2">
          {aiResult.winner} {t('compare.wins')}
        </h3>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">{aiResult.reasoning}</p>

        {aiResult.scores && (
          <div className="space-y-4">
            {Object.entries(aiResult.scores).map(([name, s]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60 truncate">{name}</span>
                  <span className="text-sm font-bold text-white ml-2">{s.value}</span>
                </div>
                <PerformanceBar score={s.value} />
                <p className="text-xs text-white/30 mt-1">{s.reason}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-white/20 text-center">{t('compare.disclaimer')}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="text-xs text-accent/70 hover:text-accent border border-accent/20 hover:border-accent/40 px-3 py-1.5 rounded-full transition-all"
              >
                {p.name} specs →
              </Link>
            ))}
          </div>
        </div>
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
function SidebarToggle({ label }: { label: string }) {
  return (
    <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-surface-2 border border-border rounded-l-xl p-3 cursor-pointer hover:bg-surface transition-colors">
        <p className="text-xs text-white/40" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

/* ---------- Popular Comparisons ---------- */
function PopularComparisons({ items }: { items: PopularItem[] }) {
  if (!items.length) return null
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">Trending Comparisons</h3>
        <span className="text-xs text-white/30 ml-1">this week</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <Link
            key={i}
            href={`/compare?ids=${item.products.join(',')}`}
            className="flex items-center justify-between px-5 py-3.5 bg-surface border border-border rounded-xl hover:border-white/15 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-white/20 font-bold w-4 flex-shrink-0">{i + 1}</span>
              <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">{shortenCompareTitle(item.title)}</p>
            </div>
            {item.cnt > 1 && (
              <span className="flex-shrink-0 ml-3 text-xs text-white/20">{item.cnt}×</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ---------- Main ---------- */
export default function CompareClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const idsParam = searchParams.get('ids') ?? ''
  const { t } = useI18n()

  const [navSearch, setNavSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null)

  // 동일한 ids+user 조합으로 이미 실행한 비교는 재실행 방지
  const ranKeyRef = useRef<string>('')

  // 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as typeof session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as typeof session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 인기 비교 로드
  useEffect(() => {
    fetch('/api/compare/popular')
      .then((r) => r.json())
      .then((d) => setPopularItems(d.items ?? []))
      .catch(() => {})
  }, [])

  const runComparison = useCallback(async (ids: string[]) => {
    if (ids.length < 2) return

    setLoading(true)
    setError(null)
    setProducts([])
    setAiResult(null)

    try {
      setLoadingMsg(t('compare.loading_specs'))
      const details = await Promise.all(
        ids.map((id) => fetch(`/api/products/${id}`).then((r) => r.json()))
      )

      const validProducts = details.filter((d) => d.id && !d.error)
      if (validProducts.length < 2) {
        setError(t('compare.error_specs'))
        setLoading(false)
        return
      }

      setProducts(validProducts)

      // AI 비교는 로그인한 유저만
      if (!session) {
        setLoading(false)
        return
      }

      setLoadingMsg(t('compare.loading_ai'))
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
            },
          })),
          productIds: ids,
          accessToken: session.access_token,
        }),
      })

      if (compareRes.status === 401) {
        setError('login_required')
        setLoading(false)
        return
      }

      if (compareRes.status === 429) {
        setError('daily_limit')
        setRemaining(0)
        setLoading(false)
        return
      }

      const compareData = await compareRes.json()
      if (compareData.error && compareData.error !== 'login_required' && compareData.error !== 'daily_limit') {
        setError(t('compare.error_compare'))
      } else if (!compareData.error) {
        setAiResult(compareData)
        if (compareData.remaining !== null) setRemaining(compareData.remaining)
        // 인기 비교 갱신
        fetch('/api/compare/popular')
          .then((r) => r.json())
          .then((d) => setPopularItems(d.items ?? []))
          .catch(() => {})
      }
    } catch {
      setError(t('compare.error_compare'))
    } finally {
      setLoading(false)
    }
  }, [t, session])

  useEffect(() => {
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length < 2) return

    // 동일한 ids + user 조합이면 탭 전환 등으로 재실행되지 않도록 방지
    const key = `${idsParam}:${session?.user?.id ?? 'anon'}`
    if (ranKeyRef.current === key) return

    ranKeyRef.current = key
    runComparison(ids)
  }, [idsParam, runComparison, session])

  // 카테고리 결정 후 DB 전체 min/max 범위 조회
  useEffect(() => {
    if (products.length === 0) return
    const cat = products[0].category.toLowerCase()
    fetch(`/api/products/category-stats?category=${cat}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCategoryStats(d) })
      .catch(() => {})
  }, [products])

  const handleNavSearch = (v: string) => {
    if (v.trim()) {
      router.push(`/compare?q=${encodeURIComponent(v.trim())}`)
    }
  }

  type SpecRowData = { label: string; sublabel: string; values: { primary: string | number; secondary?: string; bar?: number }[]; barMax?: number }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmtDisplay = (raw: Record<string, any>) => {
    const parts = [
      raw.display_inch ? `${raw.display_inch}"` : null,
      raw.display_type ?? null,
    ].filter(Boolean)
    return parts.length ? parts.join(' ') : '—'
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmtDisplaySub = (raw: Record<string, any>) => {
    const parts = [
      raw.display_resolution ?? null,
      raw.display_hz ? `${raw.display_hz}Hz` : null,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : undefined
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmtStorage = (raw: Record<string, any>) => {
    if (!raw.storage_gb) return '—'
    const gb = raw.storage_gb as number
    const size = gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`
    return raw.storage_type ? `${size} ${raw.storage_type}` : size
  }

  const category = products.length > 0 ? products[0].category.toLowerCase() : ''

  // 제품별 종합 점수 계산 (DB 전체 대비 상대 점수 — stats 로드 전엔 null)
  const productScores = categoryStats
    ? products.map((p) => computeRelativeScores({
        category,
        relativeScore:      p.specs.performanceScore,
        ram_gb:             p.raw.ram_gb,
        storage_gb:         p.raw.storage_gb,
        battery_mah:        p.raw.battery_mah,
        battery_wh:         p.raw.battery_wh,
        battery_hours:      p.raw.battery_hours,
        camera_main_mp:     p.raw.camera_main_mp,
        weight_g:           p.raw.weight_g,
        weight_kg:          p.raw.weight_kg,
        display_inch:       p.raw.display_inch,
        display_resolution: p.raw.display_resolution,
      }, categoryStats))
    : null

  // 레이더 차트용 데이터
  const PRODUCT_COLORS = ['#FF6B2B', '#3B82F6', '#22C55E', '#A855F7']
  const radarProducts: RadarProduct[] | null = productScores
    ? products.map((p, i) => ({
        name: p.name,
        color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
        dimensions: productScores[i].details.map((d) => ({ label: d.label, score: d.score })),
      }))
    : null

  const buildSpecRows = (): SpecRowData[] => {
    if (products.length === 0) return []

    const performanceRow: SpecRowData = {
      label: t('spec.performance'),
      sublabel: t('spec.benchmark'),
      barMax: 100,
      values: products.map((p, i) => {
        const score = productScores ? productScores[i].details.find((d) => d.label === 'Performance')?.score : null
        return {
          primary: score != null ? score : '—',
          secondary: p.specs.cpu ?? undefined,
          bar: score ?? undefined,
        }
      }),
    }
    const ramRow: SpecRowData = {
      label: t('spec.ram'),
      sublabel: t('spec.memory'),
      values: products.map((p) => ({ primary: p.raw.ram_gb ? `${p.raw.ram_gb}GB` : '—' })),
    }
    const storageRow: SpecRowData = {
      label: t('spec.storage'),
      sublabel: t('spec.internal'),
      values: products.map((p) => ({ primary: fmtStorage(p.raw) })),
    }
    const displayRow: SpecRowData = {
      label: t('spec.display'),
      sublabel: t('spec.screen'),
      values: products.map((p) => ({ primary: fmtDisplay(p.raw), secondary: fmtDisplaySub(p.raw) })),
    }
    const osRow: SpecRowData = {
      label: t('spec.os_label'),
      sublabel: t('spec.operating_system'),
      values: products.map((p) => ({ primary: p.raw.os ?? p.specs.os ?? '—' })),
    }

    if (category === 'smartphone') {
      return [
        performanceRow,
        ramRow,
        storageRow,
        displayRow,
        {
          label: t('spec.camera'),
          sublabel: t('spec.main_sensor'),
          values: products.map((p) => ({
            primary: p.raw.camera_main_mp ? `${p.raw.camera_main_mp}MP` : '—',
            secondary: p.raw.camera_front_mp ? `${p.raw.camera_front_mp}MP front` : undefined,
          })),
        },
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          values: products.map((p) => ({
            primary: p.raw.battery_mah ? `${p.raw.battery_mah} mAh` : '—',
          })),
        },
        osRow,
        {
          label: t('spec.weight'),
          sublabel: t('spec.weight_body'),
          values: products.map((p) => ({
            primary: p.raw.weight_g ? `${p.raw.weight_g}g` : '—',
          })),
        },
      ]
    }

    if (category === 'laptop') {
      return [
        performanceRow,
        ramRow,
        storageRow,
        displayRow,
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          values: products.map((p) => ({
            primary: p.raw.battery_wh ? `${p.raw.battery_wh} Wh` : '—',
          })),
        },
        {
          label: t('spec.battery_life'),
          sublabel: t('spec.battery_est'),
          values: products.map((p) => ({
            primary: p.raw.battery_hours ? `${p.raw.battery_hours} hrs` : '—',
          })),
        },
        osRow,
        {
          label: t('spec.weight'),
          sublabel: t('spec.weight_body'),
          values: products.map((p) => ({
            primary: p.raw.weight_kg ? `${p.raw.weight_kg} kg` : '—',
          })),
        },
      ]
    }

    if (category === 'tablet') {
      return [
        performanceRow,
        ramRow,
        storageRow,
        displayRow,
        {
          label: t('spec.camera'),
          sublabel: t('spec.main_sensor'),
          values: products.map((p) => ({
            primary: p.raw.camera_main_mp ? `${p.raw.camera_main_mp}MP` : '—',
            secondary: p.raw.camera_front_mp ? `${p.raw.camera_front_mp}MP front` : undefined,
          })),
        },
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          values: products.map((p) => ({
            primary: p.raw.battery_mah ? `${p.raw.battery_mah} mAh` : '—',
          })),
        },
        {
          label: t('spec.stylus'),
          sublabel: t('spec.stylus_support'),
          values: products.map((p) => ({
            primary: p.raw.stylus_support === true ? 'Yes' : p.raw.stylus_support === false ? 'No' : '—',
          })),
        },
        {
          label: t('spec.cellular'),
          sublabel: t('spec.connectivity'),
          values: products.map((p) => ({
            primary: p.raw.cellular === true ? 'Yes' : p.raw.cellular === false ? 'No' : '—',
          })),
        },
        osRow,
      ]
    }

    // fallback (monitor 등 기타 카테고리)
    return [
      performanceRow,
      ramRow,
      storageRow,
      displayRow,
      {
        label: t('spec.battery'),
        sublabel: t('spec.capacity'),
        values: products.map((p) => ({
          primary: p.specs.batteryCapacity ?? '—',
          secondary: p.specs.batteryLife ?? undefined,
        })),
      },
      {
        label: t('spec.camera'),
        sublabel: t('spec.main_sensor'),
        values: products.map((p) => ({ primary: p.specs.camera ?? '—' })),
      },
      osRow,
    ]
  }

  const specRows = buildSpecRows()

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

        {/* 검색 힌트 */}
        {!idsParam && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-white/40 text-sm">{t('compare.search_hint')}</p>
            <p className="text-white/20 text-xs">{t('compare.search_sub')}</p>
            {popularItems.length > 0 && (
              <div className="w-full max-w-lg mt-8">
                <PopularComparisons items={popularItems} />
              </div>
            )}
          </div>
        )}

        {/* 로딩 */}
        {loading && <LoadingState message={loadingMsg} />}

        {/* 에러 */}
        {error === 'login_required' && !loading && (
          <div className="mt-8 p-6 bg-surface border border-border rounded-card flex items-center gap-4">
            <Lock className="w-5 h-5 text-white/30 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">Sign in to compare</p>
              <p className="text-white/40 text-xs">AI-powered comparison is available for members only.</p>
            </div>
            <Link href="/login" className="flex-shrink-0 bg-accent text-white text-sm font-bold px-4 py-2 rounded-full">
              {t('auth.signin')}
            </Link>
          </div>
        )}

        {error === 'daily_limit' && !loading && (
          <div className="mt-8 p-6 bg-surface border border-amber-500/20 rounded-card flex items-center gap-4">
            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">Daily limit reached (5/5)</p>
              <p className="text-white/40 text-xs">Upgrade to Pro for unlimited comparisons.</p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 bg-amber-500 text-black text-sm font-bold px-4 py-2 rounded-full">
              Go Pro
            </Link>
          </div>
        )}

        {error && error !== 'login_required' && error !== 'daily_limit' && !loading && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-card text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 결과 */}
        {!loading && products.length >= 2 && (
          <div className="mt-8">
            {/* AI Pick — 로그인 유저만, 에러 없을 때 */}
            {session && aiResult && (
              <AIPickBanner
                winner={aiResult.winner}
                reasoning={aiResult.summary}
                onViewReasoning={() => setShowReasoning(true)}
                t={t}
              />
            )}
            {!session && (
              <AIPickLocked t={t} />
            )}

            {/* 남은 사용량 (무료 유저) */}
            {session && aiResult && aiResult.remaining !== null && (
              <div className="flex items-center justify-end gap-2 mb-4 -mt-4">
                <span className="text-xs text-white/30">
                  {aiResult.remaining} comparison{aiResult.remaining !== 1 ? 's' : ''} left today
                </span>
                <Link href="/pricing" className="text-xs text-accent hover:underline">Go Pro →</Link>
              </div>
            )}

            {/* 비교 테이블 */}
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-8">
              <div
                className="grid border-b border-border"
                style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}
              >
                <div className="p-4">
                  <p className="text-xs text-white/40 mb-1">{t('compare.overview')}</p>
                  <p className="text-sm font-bold text-white">{t('compare.top_choices')}</p>
                </div>
                {products.map((p) => (
                  <div key={p.id} className="p-4 border-l border-border">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {/* Overall Score row — DB 전체 상대 점수 */}
              {productScores && productScores.length >= 2 && (() => {
                const maxScore = Math.max(...productScores.map((s) => s.overall))
                return (
                  <div
                    className="grid border-t border-border bg-surface-2/40"
                    style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}
                  >
                    <div className="p-4 flex flex-col gap-0.5 justify-center">
                      <span className="text-xs text-accent/70 uppercase tracking-widest font-bold">Pickvolt</span>
                      <span className="text-sm font-semibold text-white">Overall Score</span>
                      <span className="text-[10px] text-white/30 mt-1 leading-snug">
                        Relative to all<br />{category}s in DB
                      </span>
                    </div>
                    {productScores.map((s, i) => {
                      const isWinner = s.overall === maxScore
                      const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                      return (
                        <div key={i} className="p-4 border-l border-border">
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-3xl font-black leading-none" style={{ color }}>
                              {s.overall}
                            </span>
                            <span className="text-xs text-white/30 font-semibold">/ 100</span>
                            {isWinner && (
                              <span className="ml-1 text-[9px] font-black tracking-widest bg-accent text-white rounded-full px-2 py-0.5 uppercase">Best</span>
                            )}
                          </div>
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${s.overall}%`, backgroundColor: color }}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            {s.details.map((d) => (
                              <div key={d.label} className="flex items-center gap-2">
                                <span className="text-[10px] text-white/30 w-16 flex-shrink-0">{d.label}</span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${d.score}%`, backgroundColor: color, opacity: 0.6 }}
                                  />
                                </div>
                                <span className="text-[10px] text-white/40 w-6 text-right">{d.score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {specRows.map((row) => (
                <SpecRow
                  key={row.label}
                  label={row.label}
                  sublabel={row.sublabel}
                  values={row.values}
                  barMax={row.barMax}
                />
              ))}
            </div>

            {/* 레이더 차트 */}
            {radarProducts && (
              <div className="bg-surface border border-border rounded-card p-6 mb-6">
                <div className="mb-4">
                  <p className="text-xs text-accent/70 uppercase tracking-widest font-bold mb-0.5">Pickvolt Score</p>
                  <p className="text-sm font-bold text-white">Spec Radar</p>
                  <p className="text-xs text-white/30 mt-0.5">Relative to all {category}s in DB — updates automatically as new products are added</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <RadarChart products={radarProducts} size={260} />
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    {radarProducts.map((rp, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: rp.color }} />
                          <span className="text-xs font-bold text-white truncate">{rp.name}</span>
                          {productScores && (
                            <span className="ml-auto text-xs font-black" style={{ color: rp.color }}>
                              {productScores[i].overall}<span className="text-white/30 font-normal">/100</span>
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {rp.dimensions.map((dim) => (
                            <div key={dim.label} className="flex items-center gap-2">
                              <span className="text-[10px] text-white/30 w-16 flex-shrink-0">{dim.label}</span>
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${dim.score}%`, backgroundColor: rp.color }}
                                />
                              </div>
                              <span className="text-[10px] text-white/50 w-7 text-right">{dim.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex items-center justify-end gap-3 mb-12">
              <button className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20">
                <Download className="w-4 h-4" />
                {t('compare.export_pdf')}
              </button>
              <button className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20">
                <Share2 className="w-4 h-4" />
                {t('compare.share')}
              </button>
            </div>

            {/* 인기 비교 */}
            <PopularComparisons items={popularItems} />
          </div>
        )}
      </main>

      {showReasoning && aiResult && (
        <ReasoningModal
          aiResult={aiResult}
          products={products}
          onClose={() => setShowReasoning(false)}
          t={t}
        />
      )}

      {!loading && products.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            {t('compare.new_comparison')}
          </button>
        </div>
      )}

      <SidebarToggle label={t('compare.specs_side_by_side')} />
    </>
  )
}
