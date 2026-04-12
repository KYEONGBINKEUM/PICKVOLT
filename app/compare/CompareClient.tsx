'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Download, Share2, ChevronRight, Loader2, TrendingUp, Lock, Zap, Code2, FileDown, Copy, ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PerformanceBar from '@/components/PerformanceBar'
import { useI18n, type Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { shortenCompareTitle, shortenProductName } from '@/lib/utils'
import { saveLocalHistory } from '@/lib/localHistory'
import { computeRelativeScores, type CategoryStats } from '@/lib/scoring'
import RadarChart, { type RadarProduct } from '@/components/RadarChart'
import ReviewSection from '@/components/ReviewSection'

const PRODUCT_COLORS = ['#FF6B2B', '#3B82F6', '#22C55E', '#A855F7']

interface ProductSpecs {
  cpu?: string | null
  cpuSpeedMHz?: number | null
  performanceScore?: number | null
  gb6Single?: number | null
  gb6Multi?: number | null
  tdmark?: number | null
  antutu?: number | null
  cinebenchSingle?: number | null
  cinebenchMulti?: number | null
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
  price_usd?: number | null
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
    <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-[#FF6B2B] via-accent to-[#cc3300] p-5 sm:p-8 mb-6 sm:mb-8">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <span className="text-[10px] sm:text-xs font-bold tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-white uppercase">
          {t('compare.aipick')}
        </span>
      </div>
      <div className="max-w-lg">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-black leading-tight mb-2 sm:mb-3 pr-16 sm:pr-0">
          the {winner} {t('compare.winner')}
        </h2>
        <p className="text-black/70 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">{reasoning}</p>
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
      <div className="relative aspect-square sm:aspect-[4/3] rounded-lg sm:rounded-xl bg-surface-2 border border-border mb-2 sm:mb-4 overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-2 sm:p-4"
            />
            <span className="absolute bottom-1 right-1.5 text-[8px] text-white/20 leading-none hidden sm:block">
              © {sourceDomain}
            </span>
          </>
        ) : (
          <div className="text-center p-2">
            <p className="text-[10px] text-white/30">{product.brand}</p>
          </div>
        )}
      </div>
      <Link
        href={`/product/${product.id}`}
        className="text-xs sm:text-sm font-bold text-white hover:text-accent transition-colors line-clamp-2 leading-snug"
      >
        {product.name}
      </Link>
    </div>
  )
}

/* ---------- Spec Row ---------- */
function SpecRow({
  label,
  sublabel,
  values,
  barMax = 100,
  winnerIndex = -1,
  colors = [],
  rowIndex = 0,
  nameLabels = [],
  productImages = [],
}: {
  label: string
  sublabel: string
  values: { primary: string | number; secondary?: string; bar?: number }[]
  barMax?: number
  winnerIndex?: number
  winnerColor?: string
  colors?: string[]
  rowIndex?: number
  productNames?: string[]
  nameLabels?: string[]
  productImages?: (string | null)[]
}) {
  const evenRow = rowIndex % 2 === 0
  return (
    <div className="border-t border-border">
      {/* ── 모바일: 세로 나열 ── */}
      <div className={`sm:hidden ${evenRow ? '' : 'bg-white/[0.018]'}`}>
        {/* 스펙 헤더 */}
        <div className="px-4 pt-3 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-white/25">{sublabel}</span>
          <span className="text-[13px] font-bold text-white/55 ml-1.5">{label}</span>
        </div>
        {/* 제품별 값 */}
        {values.map((v, i) => {
          const isWinner = i === winnerIndex
          const color = colors[i % colors.length] ?? '#FF6B2B'
          const hasBar = v.bar !== undefined
          const nameLabel = nameLabels[i] ?? ''
          const imgSrc = productImages[i] ?? null
          return (
            <div
              key={i}
              className="px-4 pt-2.5 pb-3 border-t border-border/20"
              style={isWinner ? { backgroundColor: `${color}08` } : {}}
            >
              {/* 썸네일 + 제품명/칩셋명 */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg bg-surface-2 border border-border overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ borderTopColor: color, borderTopWidth: 2 }}
                >
                  {imgSrc
                    ? <img src={imgSrc} alt={nameLabel} className="w-full h-full object-contain p-0.5" />
                    : <div className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: color }} />
                  }
                </div>
                {nameLabel && (
                  <p className="text-[11px] text-white/40 leading-tight truncate flex-1">{nameLabel}</p>
                )}
              </div>
              {hasBar ? (
                /* 점수가 있는 행: 숫자 왼쪽, 바 오른쪽 */
                <div className="flex items-center gap-3">
                  <span className="text-[20px] font-black leading-none flex-shrink-0 w-9" style={{ color: isWinner ? color : 'rgba(255,255,255,0.85)' }}>
                    {v.primary}
                  </span>
                  <div className="flex-1 min-w-0">
                    <PerformanceBar score={v.bar!} max={barMax} color={color} />
                  </div>
                  {isWinner && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                      BEST
                    </span>
                  )}
                </div>
              ) : (
                /* 일반 값 행 */
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-[18px] font-black leading-tight ${isWinner ? 'text-white' : 'text-white/72'}`}>
                    {v.primary}
                  </span>
                  {isWinner && (
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                      BEST
                    </span>
                  )}
                </div>
              )}
              {v.secondary && <p className="text-xs text-white/30 mt-1 leading-tight">{v.secondary}</p>}
            </div>
          )
        })}
      </div>

      {/* ── 데스크탑: 가로 그리드 ── */}
      <div
        className="hidden sm:grid"
        style={{ gridTemplateColumns: `80px repeat(${values.length}, 1fr)` }}
      >
        <div className="p-4 flex flex-col gap-0.5 justify-center">
          <span className="text-xs text-white/40">{sublabel}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {values.map((v, i) => {
          const isWinner = i === winnerIndex
          const color = colors[i % colors.length] ?? '#FF6B2B'
          return (
            <div key={i}
              className="p-4 border-l border-border transition-colors"
              style={isWinner ? { backgroundColor: `${color}12` } : {}}>
              {nameLabels[i] && (
                <p className="text-[10px] text-white/30 mb-1.5 truncate">{nameLabels[i]}</p>
              )}
              <span className="text-2xl font-black text-white break-words leading-tight">{v.primary}</span>
              {v.secondary && <p className="text-xs text-white/40 mt-0.5">{v.secondary}</p>}
              {v.bar !== undefined && <PerformanceBar score={v.bar} max={barMax} color={color} />}
            </div>
          )
        })}
      </div>
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
            {Object.entries(aiResult.scores).map(([name, s], i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60 truncate">{name}</span>
                  <span className="text-sm font-bold text-white ml-2">{s.value}</span>
                </div>
                <PerformanceBar score={s.value} color={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />
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

/* ---------- AI Pick Loading ---------- */
function AIPickLoading({ t }: { t: (k: string) => string }) {
  return (
    <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-[#FF6B2B]/30 via-accent/20 to-[#cc3300]/20 border border-accent/20 p-8 mb-8">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }} />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <span className="text-sm text-accent/80 font-semibold tracking-wide">
          {t('compare.loading_ai')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="h-8 w-2/3 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-4 w-full bg-white/6 rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-white/6 rounded animate-pulse" />
        <div className="mt-5 h-9 w-36 bg-white/10 rounded-full animate-pulse" />
      </div>
    </div>
  )
}

/* ---------- Action Buttons ---------- */
function ActionButtons({
  t,
  onExportHTML,
  onExportImage,
  onExportPDF,
}: {
  t: (k: string) => string
  onExportHTML: () => Promise<void>
  onExportImage: () => Promise<void>
  onExportPDF: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; sub: string } | null>(null)

  const showToast = (msg: string, sub: string) => {
    setToast({ msg, sub })
    setTimeout(() => setToast(null), 2500)
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setExporting(key)
    setOpen(false)
    try {
      await fn()
      if (key === 'html')  showToast(t('export.toast_html'), t('export.toast_paste'))
      if (key === 'image') showToast(t('export.toast_image'), t('export.toast_paste'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <>
      {/* Toast overlay */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white text-black rounded-2xl px-8 py-5 shadow-2xl text-center">
            <p className="font-bold text-base">✓ {toast.msg}</p>
            <p className="text-sm text-black/50 mt-1">{toast.sub}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mb-12 print:hidden">
        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('export.label')}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-2 bg-surface-2 border border-border rounded-xl overflow-hidden shadow-xl min-w-[200px] z-20">
                <button
                  onClick={() => wrap('html', onExportHTML)}
                  disabled={!!exporting}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <Code2 className="w-4 h-4 flex-shrink-0" />
                  {t('export.html')}
                </button>
                <button
                  onClick={() => wrap('image', onExportImage)}
                  disabled={!!exporting}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left border-t border-border"
                >
                  <Copy className="w-4 h-4 flex-shrink-0" />
                  {t('export.image')}
                </button>
                <button
                  onClick={() => wrap('pdf', onExportPDF)}
                  disabled={!!exporting}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left border-t border-border"
                >
                  <FileDown className="w-4 h-4 flex-shrink-0" />
                  {t('export.pdf')}
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 bg-surface-2 border border-border text-white/70 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:border-white/20"
        >
          <Share2 className="w-4 h-4" />
          {copied ? 'Copied!' : t('compare.share')}
        </button>
      </div>
    </>
  )
}

/* ---------- Popular Comparisons ---------- */
function PopularComparisons({ items, t }: { items: PopularItem[]; t: (k: string) => string }) {
  if (!items.length) return null
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
        <span className="text-xs text-white/30 ml-1">{t('compare.trending_sub')}</span>
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

/* ---------- Review Tabs ---------- */
function ReviewTabs({ products }: { products: Product[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  if (products.length === 0) return null
  const active = products[activeIdx]
  return (
    <div className="mt-4 mb-32 sm:mb-8 bg-surface border border-border rounded-card overflow-hidden" data-export-exclude="true">
      {/* 탭 헤더 */}
      <div className="flex overflow-x-auto border-b border-border" style={{ scrollbarWidth: 'none' }}>
        {products.map((p, pi) => {
          const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
          const isActive = pi === activeIdx
          return (
            <button
              key={p.id}
              onClick={() => setActiveIdx(pi)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
                isActive ? 'text-white' : 'text-white/35 hover:text-white/60 border-transparent'
              }`}
              style={isActive ? { borderBottomColor: color } : {}}
            >
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="w-5 h-5 object-contain flex-shrink-0" />
              )}
              <span className="truncate max-w-[120px] sm:max-w-[180px]">{p.name}</span>
            </button>
          )
        })}
      </div>
      {/* 리뷰 내용 */}
      <div className="px-5 py-2">
        <ReviewSection key={active.id} productId={active.id} readOnly />
      </div>
    </div>
  )
}

// RAM / Storage 옵션 파싱 ("8, 16, 32" → [8, 16, 32])
function parseOptions(val: string | number | null | undefined): number[] {
  if (val == null) return []
  return String(val).split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
}
function fmtGB(n: number): string {
  return n >= 1024 ? `${n % 1024 === 0 ? n / 1024 : (n / 1024).toFixed(1)}TB` : `${n}GB`
}

/* ---------- Main ---------- */
export default function CompareClient() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const historyId = searchParams.get('history') ?? ''
  const { t, locale } = useI18n()

  const [products, setProducts] = useState<Product[]>([])
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showBottomBar, setShowBottomBar] = useState(false)

  // 동일한 ids+user 조합으로 이미 실행한 비교는 재실행 방지
  const ranKeyRef = useRef<string>('')
  const compareTableRef = useRef<HTMLDivElement>(null)
  const mobileHeaderRef = useRef<HTMLDivElement>(null)

  // 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session as typeof session)
      setSessionLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s as typeof session)
      setSessionLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 모바일 헤더가 사라지면 하단 바 표시
  useEffect(() => {
    const el = mobileHeaderRef.current
    if (!el || products.length < 2) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowBottomBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-56px 0px 0px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [products])

  // 인기 비교 로드
  useEffect(() => {
    fetch('/api/compare/popular')
      .then((r) => r.json())
      .then((d) => setPopularItems(d.items ?? []))
      .catch(() => {})
  }, [])

  const runComparison = useCallback(async (ids: string[], fromHistoryId?: string) => {
    if (ids.length < 2) return

    setLoading(true)
    setLoadingAI(false)
    setError(null)
    setProducts([])
    setAiResult(null)

    try {
      // ── 1단계: 스펙 로드 ──────────────────────────────────────────────────
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
      setLoading(false)

      // ── 히스토리에서 불러온 경우: 저장된 AI 결과 사용 (API 재호출 없음) ──
      if (fromHistoryId) {
        // 로그인 유저: Supabase에서 저장된 결과 fetch
        if (fromHistoryId.startsWith('local_')) {
          // 로컬 히스토리: localStorage에서 결과 읽기
          const { getLocalHistory } = await import('@/lib/localHistory')
          const localItems = getLocalHistory()
          const found = localItems.find((item) => item.id === fromHistoryId)
          if (found?.result) {
            setAiResult(found.result as AiResult)
            return
          }
        } else {
          const { data } = await supabase
            .from('comparison_history')
            .select('result')
            .eq('id', fromHistoryId)
            .single()
          if (data?.result) {
            setAiResult(data.result as AiResult)
            return
          }
        }
      }

      setLoadingAI(true)   // 스펙 완료 즉시 AI 로딩 표시 시작

      // ── 2단계: AI 비교 ────────────────────────────────────────────────────
      const comparePayload = JSON.stringify({
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
        accessToken: session?.access_token ?? null,
        locale: locale as Locale,
      })

      let compareRes = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: comparePayload,
      })

      // 서버 오류 시 1회 재시도
      if (compareRes.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500))
        compareRes = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: comparePayload,
        })
      }

      if (compareRes.status === 401) { setError('login_required'); return }
      if (compareRes.status === 429) { setError('daily_limit'); setRemaining(0); return }

      const compareData = await compareRes.json()
      if (compareData.error && compareData.error !== 'login_required' && compareData.error !== 'daily_limit') {
        setError(t('compare.error_compare'))
      } else {
        setAiResult(compareData)
        if (compareData.remaining !== null) setRemaining(compareData.remaining)

        // 비로그인 사용자: localStorage에 기록 저장
        if (!session) {
          const title = validProducts.map((p) => shortenProductName(p.name)).join(' vs ')
          saveLocalHistory({
            id: `local_${Date.now()}`,
            title,
            products: ids,
            result: {
              winner: compareData.winner,
              summary: compareData.summary,
              reasoning: compareData.reasoning,
              scores: compareData.scores ?? {},
            },
            created_at: new Date().toISOString(),
          })
        }

        fetch('/api/compare/popular')
          .then((r) => r.json())
          .then((d) => setPopularItems(d.items ?? []))
          .catch(() => {})
      }
    } catch {
      setError(t('compare.error_compare'))
    } finally {
      setLoading(false)
      setLoadingAI(false)
    }
  }, [t, session, locale])

  useEffect(() => {
    if (!sessionLoaded) return  // 세션 확인 전 실행 차단

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length < 2) return

    // 동일한 ids + user 조합이면 탭 전환 등으로 재실행되지 않도록 방지
    const key = `${idsParam}:${session?.user?.id ?? 'anon'}`
    if (ranKeyRef.current === key) return

    ranKeyRef.current = key
    runComparison(ids, historyId || undefined)
  }, [idsParam, historyId, runComparison, session, sessionLoaded])

  // 카테고리 결정 후 DB 전체 min/max 범위 조회
  useEffect(() => {
    if (products.length === 0) return
    const cat = products[0].category.toLowerCase()
    fetch(`/api/products/category-stats?category=${cat}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCategoryStats(d) })
      .catch(() => {})

  }, [products])

  type SpecRowData = { label: string; sublabel: string; values: { primary: string | number; secondary?: string; bar?: number; numericVal?: number }[]; barMax?: number; higherIsBetter?: boolean; nameLabels?: string[] }

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
  // 반영 항목: Performance · RAM · Battery · Camera (무게/스토리지/디스플레이 제외)
  const productScores = categoryStats
    ? products.map((p) => {
        return computeRelativeScores({
          category,
          relativeScore:    p.specs.performanceScore,
          gb6Single:        p.specs.gb6Single,
          gb6Multi:         p.specs.gb6Multi,
          tdmark:           p.specs.tdmark,
          antutu:           p.specs.antutu,
          cinebenchSingle:  p.specs.cinebenchSingle,
          cinebenchMulti:   p.specs.cinebenchMulti,
          ram_gb:           p.raw.ram_gb,
          battery_mah:      p.raw.battery_mah,
          battery_wh:       p.raw.battery_wh,
          battery_hours:    p.raw.battery_hours,
          camera_main_mp:   p.raw.camera_main_mp,
        }, categoryStats)
      })
    : null

  // 레이더 차트용 데이터
  const radarProducts: RadarProduct[] | null = productScores
    ? products.map((p, i) => ({
        name: p.name,
        color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
        dimensions: productScores[i].details.map((d) => ({ label: d.label, score: d.score })),
      }))
    : null

  const buildSpecRows = (): SpecRowData[] => {
    if (products.length === 0) return []

    // 기본: 제품명 레이블
    const pNames = products.map((p) => p.name)
    // 성능 행: 칩셋명 레이블
    const chipNames = products.map((p) => p.specs.cpu ?? p.name)

    const performanceRow: SpecRowData = {
      label: t('spec.performance'),
      sublabel: t('spec.benchmark'),
      barMax: 100,
      higherIsBetter: true,
      nameLabels: chipNames,
      values: products.map((p, i) => {
        const score = productScores ? productScores[i].details.find((d) => d.label === 'Performance')?.score : null
        return {
          primary: score != null ? score : '—',
          bar: score ?? undefined,
          numericVal: score ?? undefined,
        }
      }),
    }
    const ramRow: SpecRowData = {
      label: t('spec.ram'),
      sublabel: t('spec.memory'),
      higherIsBetter: true,
      nameLabels: pNames,
      values: products.map((p) => {
        const opts = parseOptions(p.raw.ram_gb)
        const maxN = opts.length > 0 ? Math.max(...opts) : null
        const label = opts.length > 0 ? opts.map(fmtGB).join(' / ') : '—'
        return { primary: label, numericVal: maxN ?? undefined }
      }),
    }
    const storageRow: SpecRowData = {
      label: t('spec.storage'),
      sublabel: t('spec.internal'),
      nameLabels: pNames,
      values: products.map((p) => {
        const opts = parseOptions(p.raw.storage_gb)
        if (opts.length > 0) {
          const label = opts.map((n) => fmtGB(n)).join(' / ')
          return { primary: p.raw.storage_type ? `${label} ${p.raw.storage_type}` : label }
        }
        return { primary: fmtStorage(p.raw) }
      }),
    }
    const displayRow: SpecRowData = {
      label: t('spec.display'),
      sublabel: t('spec.screen'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: fmtDisplay(p.raw) })),
    }
    const resolutionRow: SpecRowData = {
      label: t('spec.resolution'),
      sublabel: t('spec.resolution_sub'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.display_resolution ?? '—' })),
    }
    const refreshRateRow: SpecRowData = {
      label: t('spec.refresh_rate'),
      sublabel: t('spec.refresh_rate_sub'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.display_hz ? `${p.raw.display_hz}Hz` : '—' })),
    }
    const osRow: SpecRowData = {
      label: t('spec.os_label'),
      sublabel: t('spec.operating_system'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.os ?? p.specs.os ?? '—' })),
    }
    const priceRow: SpecRowData = {
      label: t('spec.price'),
      sublabel: t('spec.price_sub'),
      higherIsBetter: false,
      nameLabels: pNames,
      values: products.map((p) => ({
        primary: p.price_usd ? `$${Number(p.price_usd).toLocaleString()}` : '—',
        numericVal: p.price_usd ?? undefined,
      })),
    }

    if (category === 'smartphone') {
      return [
        performanceRow,
        ramRow,
        storageRow,
        displayRow,
        resolutionRow,
        refreshRateRow,
        {
          label: t('spec.camera'),
          sublabel: t('spec.main_sensor'),
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.camera_main_mp ? `${p.raw.camera_main_mp}MP` : '—',
            secondary: p.raw.camera_front_mp ? `${p.raw.camera_front_mp}MP front` : undefined,
          })),
        },
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          higherIsBetter: true,
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.battery_mah ? `${p.raw.battery_mah} mAh` : '—',
            numericVal: p.raw.battery_mah ?? undefined,
          })),
        },
        osRow,
        priceRow,
        {
          label: t('spec.weight'),
          sublabel: t('spec.weight_body'),
          higherIsBetter: false,
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.weight_g ? `${p.raw.weight_g}g` : '—',
            numericVal: p.raw.weight_g ?? undefined,
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
        resolutionRow,
        refreshRateRow,
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          higherIsBetter: true,
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.battery_wh ? `${p.raw.battery_wh} Wh` : '—',
            numericVal: p.raw.battery_wh ?? undefined,
          })),
        },
        osRow,
        priceRow,
        {
          label: t('spec.weight'),
          sublabel: t('spec.weight_body'),
          higherIsBetter: false,
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.weight_kg ? `${p.raw.weight_kg} kg` : '—',
            numericVal: p.raw.weight_kg ?? undefined,
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
        resolutionRow,
        refreshRateRow,
        {
          label: t('spec.camera'),
          sublabel: t('spec.main_sensor'),
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.camera_main_mp ? `${p.raw.camera_main_mp}MP` : '—',
            secondary: p.raw.camera_front_mp ? `${p.raw.camera_front_mp}MP front` : undefined,
          })),
        },
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          higherIsBetter: true,
          nameLabels: pNames,
          values: products.map((p) => ({
            primary: p.raw.battery_mah ? `${p.raw.battery_mah} mAh` : '—',
            numericVal: p.raw.battery_mah ?? undefined,
          })),
        },
        osRow,
        priceRow,
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

  const handleExportHTML = async () => {
    const rows = specRows
    const colStyle = `border: 1px solid #2a2a2a; padding: 12px 16px; vertical-align: top;`
    const headerCols = products.map((p) =>
      `<th style="${colStyle} background:#1a1a1a; color:#fff; font-size:13px;">${p.name}</th>`
    ).join('')
    const bodyRows = rows.map((row) =>
      `<tr>
        <td style="${colStyle} background:#161616; color:#aaa; font-size:11px; white-space:nowrap;">${row.label}</td>
        ${row.values.map((v) =>
          `<td style="${colStyle} color:#fff; font-size:13px; font-weight:700;">${v.primary}${v.secondary ? `<br><span style="font-size:10px;color:#666;font-weight:400;">${v.secondary}</span>` : ''}</td>`
        ).join('')}
      </tr>`
    ).join('')
    const aiRow = aiResult
      ? `<tr><td colspan="${products.length + 1}" style="${colStyle} background:#ff6b2b22; color:#ff6b2b; font-size:13px; font-weight:700;">AI Pick: ${aiResult.winner} — ${aiResult.summary}</td></tr>`
      : ''
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Product Comparison — PICKVOLT</title>
<style>body{margin:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}table{border-collapse:collapse;width:100%;}h2{color:#fff;margin:0 0 16px;font-size:20px;}p{color:#888;font-size:12px;margin:0 0 20px;}</style>
</head>
<body style="padding:24px;">
<h2>Product Comparison</h2>
<p>pickvolt.com · ${new Date().toLocaleDateString()}</p>
<table>
  <thead><tr><th style="${colStyle} background:#111; color:#888; font-size:11px; text-align:left;">Spec</th>${headerCols}</tr></thead>
  <tbody>${bodyRows}${aiRow}</tbody>
</table>
</body>
</html>`
    await navigator.clipboard.writeText(html)
  }

  const handleExportImage = async () => {
    const el = compareTableRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { backgroundColor: '#111827', scale: 2, useCORS: true, logging: false, ignoreElements: (e) => e.getAttribute('data-export-exclude') === 'true' })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      } catch {
        // Fallback: download as file if clipboard write is blocked
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pickvolt-compare-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  const handleExportPDF = async () => {
    const el = compareTableRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { backgroundColor: '#111827', scale: 2, useCORS: true, logging: false, ignoreElements: (e) => e.getAttribute('data-export-exclude') === 'true' })
    const imgData = canvas.toDataURL('image/png')
    // Landscape A4: 297mm x 210mm
    const pdfW = 297
    const ratio = pdfW / (canvas.width / 2)
    const pdfH = Math.max(210, (canvas.height / 2) * ratio)
    const orientation = pdfH > pdfW ? 'portrait' : 'landscape'
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const imgW = pageW
    const imgH = (canvas.height / canvas.width) * pageW
    if (imgH <= pageH) {
      doc.addImage(imgData, 'PNG', 0, 0, imgW, imgH)
    } else {
      // Multi-page: slice the image across pages
      const scale = pageW / (canvas.width / 2)
      const pxPerPage = pageH / scale
      let srcY = 0
      while (srcY < canvas.height / 2) {
        if (srcY > 0) doc.addPage()
        const sliceH = Math.min(pxPerPage, canvas.height / 2 - srcY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = sliceH * 2
        const ctx = sliceCanvas.getContext('2d')!
        ctx.drawImage(canvas, 0, srcY * 2, canvas.width, sliceH * 2, 0, 0, canvas.width, sliceH * 2)
        doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH * scale)
        srcY += sliceH
      }
    }
    doc.save(`pickvolt-compare-${Date.now()}.pdf`)
  }

  return (
    <>
      <Navbar showSearch />

      <main className="min-h-screen bg-background pt-20 pb-20 px-4 md:px-6 max-w-inner mx-auto">

        {/* 검색 힌트 */}
        {!idsParam && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-white/40 text-sm">{t('compare.search_hint')}</p>
            <p className="text-white/20 text-xs">{t('compare.search_sub')}</p>
            {popularItems.length > 0 && (
              <div className="w-full max-w-lg mt-8">
                <PopularComparisons items={popularItems} t={t} />
              </div>
            )}
          </div>
        )}

        {/* 로딩 */}
        {loading && <LoadingState message={loadingMsg} />}

        {/* 에러 */}
        {error === 'login_required' && !loading && sessionLoaded && (
          <div className="mt-8 p-6 bg-surface border border-border rounded-card flex items-center gap-4">
            <Lock className="w-5 h-5 text-white/30 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">Sign in to use AI Pick</p>
              <p className="text-white/40 text-xs">Create a free account to see AI-powered comparisons.</p>
            </div>
            <Link href="/login" className="flex-shrink-0 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
              {t('auth.signin')}
            </Link>
          </div>
        )}
        {error === 'daily_limit' && !loading && (
          <div className="mt-8 p-6 bg-surface border border-amber-500/30 rounded-card flex items-center gap-4">
            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">Daily limit reached</p>
              <p className="text-white/40 text-xs">Upgrade to Pro for unlimited AI comparisons.</p>
            </div>
            <Link href="/pricing" className="flex-shrink-0 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
              Upgrade
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
            {/* AI Pick 영역 */}
            {loadingAI && <AIPickLoading t={t} />}
            {sessionLoaded && !session && !loadingAI && !aiResult && !error && <AIPickLocked t={t} />}
            {!loadingAI && aiResult && (
              <>
                <AIPickBanner
                  winner={aiResult.winner}
                  reasoning={aiResult.summary}
                  onViewReasoning={() => setShowReasoning(true)}
                  t={t}
                />
                {session && aiResult.remaining !== null && (
                  <p className="text-xs text-white/30 text-center -mt-4 mb-6">
                    {aiResult.remaining} comparison{aiResult.remaining !== 1 ? 's' : ''} left today
                  </p>
                )}
              </>
            )}

            {/* 비교 테이블 */}
            <div id="spec-table" ref={compareTableRef} className="bg-surface border border-border rounded-card overflow-hidden mb-8">

              {/* ── 모바일 헤더: 가로 슬라이드 카드 ── */}
              <div ref={mobileHeaderRef} className="sm:hidden border-b border-border">
                <div className="flex overflow-x-auto gap-3 px-4 py-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                  {products.map((p, pi) => {
                    const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
                    return (
                      <div key={p.id} className="flex-shrink-0 snap-start w-[52vw] min-w-[180px]">
                        {/* 이미지 */}
                        <div className="aspect-square rounded-2xl bg-surface-2 border border-border overflow-hidden flex items-center justify-center mb-3" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-3" />
                            : <span className="text-xs text-white/20 font-bold">{p.brand}</span>
                          }
                        </div>
                        {/* 이름 */}
                        <Link href={`/product/${p.id}`} className="text-sm font-bold text-white/90 hover:text-accent line-clamp-2 leading-snug block mb-1">
                          {p.name}
                        </Link>
                        {p.price_usd && (
                          <p className="text-xs text-white/40 mb-2">${Number(p.price_usd).toLocaleString()}</p>
                        )}
                        {p.raw.amazon_url && (
                          <a
                            href={p.raw.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="flex items-center justify-center w-full py-2 rounded-xl"
                            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/amazon-logo.svg" alt="Amazon" width={52} height={16} style={{ display: 'block' }} />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── 헤더: 데스크탑 그리드 ── */}
              <div
                className="hidden sm:grid border-b border-border"
                style={{ gridTemplateColumns: `80px repeat(${products.length}, 1fr)` }}
              >
                <div className="p-3 sm:p-4 flex items-center">
                  <p className="text-[10px] sm:text-xs text-white/40 font-semibold">{t('compare.overview')}</p>
                </div>
                {products.map((p, pi) => {
                  return (
                    <div key={p.id} className="p-2 sm:p-4 border-l border-border">
                      <ProductCard product={p} />
                      {p.raw.amazon_url && (
                        <a
                          href={p.raw.amazon_url}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          onClick={(e) => e.stopPropagation()}
                          data-export-exclude="true"
                          className="mt-2 sm:mt-3 flex items-center justify-center gap-1.5 w-full py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all hover:brightness-105 active:scale-95 select-none"
                          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/amazon-logo.svg" alt="Amazon" width={56} height={18} className="sm:w-[72px] sm:h-[22px]" style={{ display: 'block' }} />
                          <span className="hidden sm:inline" style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.02em' }}>{t('compare.buy_now')}</span>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Overall Score row — DB 전체 상대 점수 */}
              {productScores && productScores.length >= 2 && (() => {
                const maxScore = Math.max(...productScores.map((s) => s.overall))
                return (
                  <div className="border-t border-border bg-surface-2/40">
                    {/* ── 모바일: 세로 나열 (SpecRow와 동일한 패턴) ── */}
                    <div className="sm:hidden">
                      <div className="px-4 pt-3 pb-2">
                        <span className="text-[10px] uppercase tracking-wider text-white/25">{t('compare.overall_score')}</span>
                      </div>
                      {productScores.map((s, i) => {
                        const isWinner = s.overall === maxScore
                        const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                        const p = products[i]
                        return (
                          <div key={i} className="px-4 pt-2.5 pb-3 border-t border-border/20" style={isWinner ? { backgroundColor: `${color}08` } : {}}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border overflow-hidden flex items-center justify-center flex-shrink-0" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                                {p?.image_url
                                  ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-0.5" />
                                  : <div className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: color }} />
                                }
                              </div>
                              <p className="text-[11px] text-white/40 leading-tight truncate flex-1">{p?.name ?? ''}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[20px] font-black leading-none flex-shrink-0 w-9" style={{ color: isWinner ? color : 'rgba(255,255,255,0.85)' }}>
                                {s.overall}
                              </span>
                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.overall}%`, backgroundColor: color }} />
                              </div>
                              {isWinner && <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>BEST</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* ── 데스크탑: 기존 그리드 ── */}
                    <div
                      className="hidden sm:grid"
                      style={{ gridTemplateColumns: `80px repeat(${products.length}, 1fr)` }}
                    >
                      <div className="p-3 sm:p-4 flex flex-col gap-0.5 justify-center">
                        <span className="text-[10px] sm:text-sm font-semibold text-white/60 sm:text-white">{t('compare.overall_score')}</span>
                      </div>
                      {productScores.map((s, i) => {
                        const isWinner = s.overall === maxScore
                        const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                        return (
                          <div key={i} className="p-3 sm:p-4 border-l border-border transition-colors"
                            style={isWinner ? { backgroundColor: `${color}12` } : {}}>
                            <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
                              <span className="text-xl sm:text-3xl font-black leading-none" style={{ color }}>
                                {s.overall}
                              </span>
                              <span className="text-[10px] sm:text-xs text-white/30 font-semibold">/ 100</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${s.overall}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {specRows.map((row, ri) => {
                // 숫자 값이 있는 행에서 winner 셀 계산
                let winnerIndex = -1
                if (row.higherIsBetter !== undefined) {
                  const nums = row.values.map((v) => v.numericVal ?? null)
                  const valid = nums.filter((n) => n != null) as number[]
                  if (valid.length > 1) {
                    const best = row.higherIsBetter ? Math.max(...valid) : Math.min(...valid)
                    const idx = nums.indexOf(best)
                    if (idx !== -1 && nums.filter((n) => n === best).length === 1) winnerIndex = idx
                  }
                }
                const winnerColor = winnerIndex >= 0 ? PRODUCT_COLORS[winnerIndex % PRODUCT_COLORS.length] : '#FF6B2B'
                return (
                  <SpecRow
                    key={`${row.label}-${ri}`}
                    label={row.label}
                    sublabel={row.sublabel}
                    values={row.values}
                    barMax={row.barMax}
                    winnerIndex={winnerIndex}
                    winnerColor={winnerColor}
                    colors={PRODUCT_COLORS}
                    rowIndex={ri}
                    nameLabels={row.nameLabels ?? products.map((p) => p.name)}
                    productImages={products.map((p) => p.image_url ?? null)}
                  />
                )
              })}
            </div>

            {/* User Reviews — 탭으로 제품별 전환 */}
            <ReviewTabs products={products} />


            {/* 액션 버튼 */}
            <ActionButtons
              t={t}
              onExportHTML={handleExportHTML}
              onExportImage={handleExportImage}
              onExportPDF={handleExportPDF}
            />

            {/* 인기 비교 */}
            <PopularComparisons items={popularItems} t={t} />
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

      {/* ── 모바일 하단 고정 바 — 헤더가 사라질 때만 표시, 슬라이더 ── */}
      {!loading && products.length >= 2 && showBottomBar && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-2xl">
          <div className="flex overflow-x-auto gap-2 px-3 pt-2 pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            {products.map((p, pi) => {
              const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
              return (
                <div key={p.id} className="flex-shrink-0 snap-start w-[28vw] min-w-[100px] flex flex-col items-center gap-1.5">
                  {/* 썸네일 — 컬러 상단 보더 */}
                  <div
                    className="w-full aspect-square rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center border border-border"
                    style={{ borderTopColor: color, borderTopWidth: 2 }}
                  >
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-1.5" />
                      : <span className="text-[8px] text-white/30 font-bold">{p.brand.slice(0, 3).toUpperCase()}</span>
                    }
                  </div>
                  {/* 제품명 */}
                  <p className="text-[9px] text-white/40 text-center leading-tight w-full line-clamp-2 px-0.5">{p.name}</p>
                  {/* Amazon 버튼 */}
                  {p.raw.amazon_url ? (
                    <a
                      href={p.raw.amazon_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="w-full flex items-center justify-center py-1 rounded-lg"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/amazon-logo.svg" alt="Amazon" width={36} height={11} style={{ display: 'block' }} />
                    </a>
                  ) : (
                    <div className="h-[20px]" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </>
  )
}
