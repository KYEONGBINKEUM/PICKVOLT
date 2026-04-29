'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Download, Share2, ChevronRight, Loader2, TrendingUp, Lock, Zap, Code2, FileDown, Copy, ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PerformanceBar from '@/components/PerformanceBar'
import { useI18n, type Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { shortenCompareTitle, shortenProductName, imgUrl } from '@/lib/utils'
import { computeRelativeScores, type CategoryStats, type CpuBenchmarkMaxes } from '@/lib/scoring'
import RadarChart, { type RadarProduct } from '@/components/RadarChart'
import ReviewSection from '@/components/ReviewSection'
import AdBanner from '@/components/AdBanner'

const PRODUCT_COLORS = ['#FF6B2B', '#3B82F6', '#22C55E', '#A855F7']
const AD_HTML_INLINE = process.env.NEXT_PUBLIC_AD_BANNER_INLINE ?? ''

interface ProductVariant {
  id: string
  variant_name: string
  cpu_name: string | null
  cpu_id: string | null
  gpu_name: string | null
  gpu_id: string | null
  ram_gb: string | null
  storage_gb: string | null
  price_usd: number | null
  amazon_url: string | null
  cpuBenchmarks: {
    relative_score: number | null
    gb6_single: number | null
    gb6_multi: number | null
    tdmark_score: number | null
    antutu_score: number | null
    cinebench_single: number | null
    cinebench_multi: number | null
    type: string | null
  } | null
  gpuRelativeScore: number | null
}

interface ProductSpecs {
  cpu?: string | null
  gpuName?: string | null
  gpuRelativeScore?: number | null
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
  wifi?: string | null
  bluetooth?: string | null
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
  variants?: ProductVariant[]
}

function fmtVariantGB(val: string | null): string | null {
  if (!val) return null
  return String(val).split(',').map((s) => {
    const n = parseFloat(s.trim())
    if (isNaN(n)) return s.trim()
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`
  }).join(' / ')
}

function makeVariantKey(ids: string[], sels: Record<number, string>): string {
  const vPart = Object.entries(sels).sort(([a], [b]) => Number(a) - Number(b)).map(([k, v]) => `${k}:${v}`).join(',')
  return `${ids.join(',')}|${vPart}`
}

function applyVariant(product: Product, variantId: string | undefined): Product {
  if (!variantId || !product.variants?.length) return product
  const v = product.variants.find((x) => x.id === variantId)
  if (!v) return product

  const ramLabel    = fmtVariantGB(v.ram_gb)
  const storageParts = v.storage_gb ? [fmtVariantGB(v.storage_gb), product.raw.storage_type].filter(Boolean).join(' ') : null

  return {
    ...product,
    price_usd: v.price_usd ?? product.price_usd,
    raw: {
      ...product.raw,
      ...(v.ram_gb     && { ram_gb:     v.ram_gb }),
      ...(v.storage_gb && { storage_gb: v.storage_gb }),
      ...(v.amazon_url !== null && { amazon_url: v.amazon_url }),
    },
    specs: {
      ...product.specs,
      ...(v.cpu_name     && { cpu:     v.cpu_name }),
      ...(v.gpu_name     && { gpuName: v.gpu_name }),
      ...(ramLabel       && { ram:     ramLabel }),
      ...(storageParts   && { storage: storageParts }),
      ...(v.cpuBenchmarks && {
        performanceScore: v.cpuBenchmarks.relative_score   ?? product.specs.performanceScore,
        gb6Single:        v.cpuBenchmarks.gb6_single       ?? product.specs.gb6Single,
        gb6Multi:         v.cpuBenchmarks.gb6_multi        ?? product.specs.gb6Multi,
        tdmark:           v.cpuBenchmarks.tdmark_score     ?? product.specs.tdmark,
        antutu:           v.cpuBenchmarks.antutu_score     ?? product.specs.antutu,
        cinebenchSingle:  v.cpuBenchmarks.cinebench_single ?? product.specs.cinebenchSingle,
        cinebenchMulti:   v.cpuBenchmarks.cinebench_multi  ?? product.specs.cinebenchMulti,
      }),
      ...(v.gpuRelativeScore != null && { gpuRelativeScore: v.gpuRelativeScore }),
    },
  }
}

interface AiResult {
  winner: string
  summary: string
  reasoning: string
  points?: number | null
  isPro: boolean
  scores?: Record<string, { value: number; reason: string }>
}

interface PopularItem {
  title: string
  products?: string[]
  href?: string
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
    <div className="relative rounded-card overflow-hidden bg-gradient-to-br from-[#FF6B2B] via-accent to-[#cc3300] p-5 lg:p-8 mb-6 lg:mb-8">
      <div className="absolute top-3 right-3 lg:top-4 lg:right-4">
        <span className="text-[10px] lg:text-xs font-bold tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 lg:px-3 lg:py-1.5 text-white uppercase">
          {t('compare.aipick')}
        </span>
      </div>
      <div className="max-w-lg">
        <h2 className="text-xl lg:text-3xl md:text-4xl font-black text-black leading-tight mb-2 lg:mb-3 pr-16 lg:pr-0">
          the {winner} {t('compare.winner')}
        </h2>
        <p className="text-black/70 text-xs lg:text-sm leading-relaxed mb-4 lg:mb-6">{reasoning}</p>
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
  const imgSrc = product.image_url ? imgUrl(product.image_url, 600) : null
  const sourceDomain = product.source_url
    ? new URL(product.source_url).hostname.replace('www.', '').replace(/\.com$/, '')
    : product.brand.toLowerCase()

  return (
    <div className="flex flex-col">
      <div className="relative aspect-square lg:aspect-[4/3] rounded-lg lg:rounded-xl bg-surface-2 border border-border mb-2 lg:mb-4 overflow-hidden flex items-center justify-center">
        {imgSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-2 lg:p-4"
            />
            <span className="absolute bottom-1 right-1.5 text-[8px] text-white/20 leading-none hidden lg:block">
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
        className="text-xs lg:text-sm font-bold text-white hover:text-accent transition-colors line-clamp-2 leading-snug"
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
  winnerIndices = [],
  colors = [],
  rowIndex = 0,
  nameLabels = [],
  productImages = [],
  showNameOnDesktop = false,
}: {
  label: string
  sublabel: string
  values: { primary: string | number; secondary?: string; bar?: number }[]
  barMax?: number
  winnerIndices?: number[]
  winnerColor?: string
  colors?: string[]
  rowIndex?: number
  productNames?: string[]
  nameLabels?: string[]
  productImages?: (string | null)[]
  showNameOnDesktop?: boolean
}) {
  const evenRow = rowIndex % 2 === 0
  return (
    <div className="border-t border-border">
      {/* ── 모바일: 세로 나열 ── */}
      <div className={`lg:hidden ${evenRow ? '' : 'bg-white/[0.018]'}`}>
        {/* 스펙 헤더 */}
        <div className="px-4 pt-3 pb-2">
          <span className="text-[10px] uppercase tracking-wider text-white/25">{sublabel}</span>
          <span className="text-[13px] font-bold text-white/55 ml-1.5">{label}</span>
        </div>
        {/* 제품별 값 */}
        {values.map((v, i) => {
          const isWinner = winnerIndices.includes(i)
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
              {/* 썸네일 + 제품명/칩셋명 + BEST 뱃지 */}
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
                  <p className="text-[13px] text-white/50 leading-tight truncate flex-1">{nameLabel}</p>
                )}
                {isWinner && (
                  <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                    BEST
                  </span>
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
                </div>
              ) : (
                /* 일반 값 행 */
                <span className={`text-[18px] font-black leading-tight ${isWinner ? 'text-white' : 'text-white/72'}`}>
                  {v.primary}
                </span>
              )}
              {v.secondary && <p className="text-xs text-white/30 mt-1 leading-tight">{v.secondary}</p>}
            </div>
          )
        })}
      </div>

      {/* ── 데스크탑: 가로 그리드 ── */}
      <div
        className="hidden lg:grid"
        style={{ gridTemplateColumns: `160px repeat(${values.length}, 1fr)` }}
      >
        <div className="p-4 flex flex-col gap-0.5 justify-center">
          <span className="text-xs text-white/40">{sublabel}</span>
          <span className="text-sm font-semibold text-white">{label}</span>
        </div>
        {values.map((v, i) => {
          const isWinner = winnerIndices.includes(i)
          const color = colors[i % colors.length] ?? '#FF6B2B'
          const nameLabel = nameLabels[i] ?? ''
          return (
            <div key={i}
              className="p-4 border-l border-border transition-colors"
              style={isWinner ? { backgroundColor: `${color}12` } : {}}>
              <span className="text-2xl font-black text-white break-words leading-tight">{v.primary}</span>
              {v.secondary && <p className="text-xs text-white/40 mt-0.5">{v.secondary}</p>}
              {v.bar !== undefined && <PerformanceBar score={v.bar} max={barMax} color={color} />}
              {showNameOnDesktop && nameLabel && <p className="text-[10px] text-white/35 mt-1 leading-tight truncate">{nameLabel}</p>}
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
            href={item.href ?? `/compare?ids=${(item.products ?? []).join(',')}`}
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
  const { t } = useI18n()
  const [activeIdx, setActiveIdx] = useState(0)
  if (products.length === 0) return null
  const active = products[activeIdx]
  return (
    <div className="mt-4 mb-32 lg:mb-8 bg-surface border border-border rounded-card overflow-hidden" data-export-exclude="true">
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
                <img src={imgUrl(p.image_url, 40)} alt={p.name} className="w-5 h-5 object-contain flex-shrink-0" />
              )}
              <span className="truncate max-w-[120px] lg:max-w-[180px]">{p.name}</span>
            </button>
          )
        })}
      </div>
      {/* 리뷰 내용 */}
      <div className="px-5 py-2">
        <ReviewSection key={active.id} productId={active.id} readOnly />
      </div>
      {/* 리뷰 작성 링크 */}
      <div className="px-5 pb-4 border-t border-border pt-3">
        <Link
          href={`/product/${active.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-accent transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          {active.name} — {t('compare.go_review')}
        </Link>
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
  const variantsParam = searchParams.get('variants') ?? ''
  const historyId = searchParams.get('history') ?? ''
  const { t, locale } = useI18n()

  const [products, setProducts] = useState<Product[]>([])
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<number, string>>({})
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [userPoints, setUserPoints] = useState<number | null>(null)
  const [autoAI, setAutoAI] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null)
  const [globalCpuMaxes, setGlobalCpuMaxes] = useState<CpuBenchmarkMaxes | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [showBottomBar, setShowBottomBar] = useState(false)

  // 동일한 ids+user 조합으로 이미 실행한 비교는 재실행 방지
  const ranKeyRef = useRef<string>('')
  const compareTableRef = useRef<HTMLDivElement>(null)
  const mobileHeaderRef = useRef<HTMLDivElement>(null)
  const aiCacheRef = useRef<Map<string, AiResult>>(new Map())
  const sessionRef = useRef<{ access_token: string; user: { id: string } } | null>(null)
  const loadingAIRef = useRef(false)

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

  // 유저 포인트 & 자동AI 설정 로드
  useEffect(() => {
    if (!session) {
      setSettingsLoaded(true)
      return
    }
    fetch('/api/user/points', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setUserPoints(d.points ?? 0)
        setAutoAI(d.auto_ai_enabled ?? true)
        setSettingsLoaded(true)
      })
      .catch(() => setSettingsLoaded(true))
  }, [session])

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

  // ref sync
  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { loadingAIRef.current = loadingAI }, [loadingAI])

  // 모델 선택 변경 시 AI 재실행 (캐시 우선)
  useEffect(() => {
    if (products.length < 2) return
    const ids = products.map((p) => p.id)
    const key = makeVariantKey(ids, selectedVariantIds)
    const cached = aiCacheRef.current.get(key)
    if (cached) { setAiResult(cached); return }
    if (Object.keys(selectedVariantIds).length === 0) return
    if (!sessionRef.current || loadingAIRef.current) return
    const effective = products.map((p, i) => applyVariant(p, selectedVariantIds[i]))
    callAI(effective, ids, key)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantIds])

  // ── AI 비교 호출 (스펙 로드 완료 후 단독 실행 가능) ─────────────────────
  const callAI = useCallback(async (loadedProducts: Product[], productIds: string[], cacheKey?: string) => {
    if (!session) return
    setLoadingAI(true)
    setError(null)

    try {
      const comparePayload = JSON.stringify({
        products: loadedProducts.map((p) => ({
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
        productIds,
        accessToken: session.access_token,
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
      if (compareRes.status === 402) { setError('no_points'); return }

      const compareData = await compareRes.json()
      if (compareData.error) {
        setError(t('compare.error_compare'))
      } else {
        setAiResult(compareData)
        if (cacheKey) aiCacheRef.current.set(cacheKey, compareData)
        if (compareData.points !== undefined && compareData.points !== null) {
          setUserPoints(compareData.points)
        }
        fetch('/api/compare/popular')
          .then((r) => r.json())
          .then((d) => setPopularItems(d.items ?? []))
          .catch(() => {})
      }
    } catch {
      setError(t('compare.error_compare'))
    } finally {
      setLoadingAI(false)
    }
  }, [session, locale, t])

  const runComparison = useCallback(async (ids: string[], fromHistoryId?: string, skipAI = false) => {
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
      // URL의 variants 파라미터로 초기 variant 선택 복원
      const initialVariants = variantsParam
        ? variantsParam.split(',').reduce((acc, vid, idx) => {
            if (vid) acc[idx] = vid
            return acc
          }, {} as Record<number, string>)
        : {}
      setSelectedVariantIds(initialVariants)
      setLoading(false)

      const baseKey = makeVariantKey(ids, {})

      // ── 히스토리에서 불러온 경우: 저장된 AI 결과 사용 (API 재호출 없음) ──
      if (fromHistoryId) {
        if (fromHistoryId.startsWith('local_')) {
          const { getLocalHistory } = await import('@/lib/localHistory')
          const localItems = getLocalHistory()
          const found = localItems.find((item) => item.id === fromHistoryId)
          if (found?.result) {
            aiCacheRef.current.set(baseKey, found.result as AiResult)
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
            aiCacheRef.current.set(baseKey, data.result as AiResult)
            setAiResult(data.result as AiResult)
            return
          }
        }
      }

      // ── 자동 AI 비활성화 시 여기서 중단 (수동 버튼 대기) ──────────────────
      if (skipAI) return

      // ── 2단계: AI 비교 ────────────────────────────────────────────────────
      await callAI(validProducts, ids, baseKey)
    } catch {
      setError(t('compare.error_compare'))
    } finally {
      setLoading(false)
    }
  }, [t, callAI])

  // 수동 AI 실행 (autoAI=false일 때 버튼 클릭)
  const handleManualAI = useCallback(() => {
    if (!session || products.length < 2 || loadingAI) return
    const ids = products.map((p) => p.id)
    const effective = products.map((p, i) => applyVariant(p, selectedVariantIds[i]))
    const key = makeVariantKey(ids, selectedVariantIds)
    callAI(effective, ids, key)
  }, [session, products, loadingAI, selectedVariantIds, callAI])

  useEffect(() => {
    if (!sessionLoaded || !settingsLoaded) return  // 세션 & 설정 확인 전 실행 차단

    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length < 2) return

    // 동일한 ids + user 조합이면 탭 전환 등으로 재실행되지 않도록 방지
    const key = `${idsParam}:${session?.user?.id ?? 'anon'}`
    if (ranKeyRef.current === key) return

    ranKeyRef.current = key
    // autoAI=false이고 로그인 상태면 AI 자동 실행 건너뜀
    runComparison(ids, historyId || undefined, !autoAI && !!session)
  }, [idsParam, historyId, runComparison, session, sessionLoaded, settingsLoaded, autoAI])

  // 카테고리 결정 후 DB 전체 min/max 범위 조회 (벤치마크 최댓값도 포함)
  useEffect(() => {
    if (products.length === 0) return
    const cats = Array.from(new Set(products.map((p) => p.category.toLowerCase())))
    const primaryCat = cats[0]
    // 첫 번째 카테고리 stats (overall 레이아웃 기준)
    fetch(`/api/products/category-stats?category=${primaryCat}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCategoryStats(d) })
      .catch(() => {})
    // 크로스 카테고리: 비교에 포함된 카테고리들의 벤치마크 최대값만 합산
    if (cats.length > 1) {
      Promise.all(cats.map((c) => fetch(`/api/products/category-stats?category=${c}`).then((r) => r.json())))
        .then((results) => {
          const merged: CpuBenchmarkMaxes = {}
          const keys = ['gb6Single','gb6Multi','tdmark','antutu','cinebenchSingle','cinebenchMulti','passmarkSingle','passmarkMulti'] as const
          for (const r of results) {
            if (r.error || !r.cpuBenchMaxes) continue
            for (const k of keys) {
              const v = r.cpuBenchMaxes[k] ?? 0
              merged[k] = Math.max(merged[k] ?? 0, v)
            }
          }
          setGlobalCpuMaxes(merged)
        })
        .catch(() => {})
    }
  }, [products])

  // variant 선택을 적용한 유효 제품 목록
  const effectiveProducts = products.map((p, i) => applyVariant(p, selectedVariantIds[i]))

  type SpecRowData = { label: string; sublabel: string; values: { primary: string | number; secondary?: string; bar?: number; numericVal?: number }[]; barMax?: number; higherIsBetter?: boolean; nameLabels?: string[]; showNameOnDesktop?: boolean }

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

  const category = effectiveProducts.length > 0 ? effectiveProducts[0].category.toLowerCase() : ''
  const isSameCategory = effectiveProducts.length > 0 && effectiveProducts.every((p) => p.category.toLowerCase() === category)

  // 제품별 종합 점수 계산 — 크로스 카테고리면 GB6 공통 공식, 같은 카테고리면 고유 공식
  const rawScores = categoryStats
    ? effectiveProducts.map((p) => {
        return computeRelativeScores({
          category:           isSameCategory ? p.category.toLowerCase() : 'cross',
          relativeScore:      p.specs.performanceScore,
          gpuRelativeScore:   p.specs.gpuRelativeScore,
          gb6Single:          p.specs.gb6Single,
          gb6Multi:           p.specs.gb6Multi,
          tdmark:             p.specs.tdmark,
          antutu:             p.specs.antutu,
          cinebenchSingle:    p.specs.cinebenchSingle,
          cinebenchMulti:     p.specs.cinebenchMulti,
          ram_gb:             p.raw.ram_gb,
          battery_mah:        p.raw.battery_mah,
          battery_wh:         p.raw.battery_wh,
          battery_hours:      p.raw.battery_hours,
          camera_main_mp:     p.raw.camera_main_mp,
          display_resolution: p.raw.display_resolution,
          display_inch:       p.raw.display_inch,
          refresh_hz:         p.raw.display_hz != null ? Number(p.raw.display_hz) : null,
        }, categoryStats, isSameCategory ? (categoryStats.cpuBenchMaxes ?? undefined) : (globalCpuMaxes ?? undefined))
      })
    : null

  // 카테고리 전체 최고값 기준으로 이미 정규화된 rawScores를 그대로 사용
  const productScores = rawScores

  // 레이더 차트용 데이터
  const radarProducts: RadarProduct[] | null = productScores
    ? effectiveProducts.map((p, i) => ({
        name: p.name,
        color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
        dimensions: productScores[i].details.map((d) => ({ label: d.label, score: d.score })),
      }))
    : null

  const buildSpecRows = (): SpecRowData[] => {
    if (effectiveProducts.length === 0) return []

    // 기본: 제품명 레이블
    const pNames = effectiveProducts.map((p) => p.name)
    // 성능 행: 칩셋명 레이블
    const chipNames = effectiveProducts.map((p) => p.specs.cpu ?? p.name)

    const performanceRow: SpecRowData = {
      label: t('spec.performance'),
      sublabel: t('spec.benchmark'),
      barMax: 100,
      higherIsBetter: true,
      nameLabels: chipNames,
      showNameOnDesktop: true,
      values: effectiveProducts.map((p, i) => {
        const score = productScores ? productScores[i].details.find((d) => d.label === 'Performance')?.score : null
        return {
          primary: score != null ? score : '—',
          bar: score ?? undefined,
          numericVal: score ?? undefined,
        }
      }),
    }
    const gpuNames = effectiveProducts.map((p) => p.specs.gpuName ?? '')
    const graphicsRow: SpecRowData = {
      label: 'GPU',
      sublabel: t('spec.benchmark'),
      barMax: 100,
      higherIsBetter: true,
      nameLabels: gpuNames,
      showNameOnDesktop: true,
      values: effectiveProducts.map((p, i) => {
        if (p.category.toLowerCase() !== 'laptop') return { primary: '—' }
        const score = productScores ? productScores[i].details.find((d) => d.label === 'Graphics')?.score : null
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
      values: effectiveProducts.map((p) => {
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
      values: effectiveProducts.map((p) => {
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
      higherIsBetter: true,
      nameLabels: pNames,
      values: effectiveProducts.map((p) => {
        const res = p.raw.display_resolution as string | null
        const match = res?.match(/(\d+)\s*[x×X]\s*(\d+)/)
        const numericVal = match ? parseInt(match[1]) * parseInt(match[2]) : undefined
        return { primary: res ?? '—', numericVal }
      }),
    }
    const refreshRateRow: SpecRowData = {
      label: t('spec.refresh_rate'),
      sublabel: t('spec.refresh_rate_sub'),
      higherIsBetter: true,
      nameLabels: pNames,
      values: effectiveProducts.map((p) => {
        const hz = p.raw.display_hz != null ? Number(p.raw.display_hz) : null
        return { primary: hz && hz > 0 ? `${hz}Hz` : '—', numericVal: hz && hz > 0 ? hz : undefined }
      }),
    }
    const osRow: SpecRowData = {
      label: t('spec.os_label'),
      sublabel: t('spec.operating_system'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.os ?? p.specs.os ?? '—' })),
    }
    const wifiRow: SpecRowData = {
      label: t('spec.wifi'),
      sublabel: t('spec.wifi_sub'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.wifi_standard ?? p.specs.wifi ?? '—' })),
    }
    const bluetoothRow: SpecRowData = {
      label: t('spec.bluetooth'),
      sublabel: t('spec.bluetooth_sub'),
      nameLabels: pNames,
      values: products.map((p) => ({ primary: p.raw.bluetooth_version ?? p.specs.bluetooth ?? '—' })),
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

    // 크로스 카테고리 비교 (laptop + smartphone/tablet 등 혼합)
    if (!isSameCategory) {
      // 랩탑(Wh)과 모바일(mAh)이 섞이면 단위가 달라 수치 비교 불가 → 베스트 뱃지 없음
      const hasLaptop    = products.some((p) => p.category.toLowerCase() === 'laptop')
      const hasNonLaptop = products.some((p) => p.category.toLowerCase() !== 'laptop')
      const mixedBatteryUnits = hasLaptop && hasNonLaptop
      // GPU 행: 크로스 시 higherIsBetter 없이 표시 (랩탑만 점수, 나머지 —)
      const crossGraphicsRow: SpecRowData = { ...graphicsRow, higherIsBetter: undefined }

      return [
        performanceRow,
        ...(hasLaptop ? [crossGraphicsRow] : []),
        ramRow,
        storageRow,
        displayRow,
        resolutionRow,
        refreshRateRow,
        {
          label: t('spec.battery'),
          sublabel: t('spec.capacity'),
          ...(mixedBatteryUnits ? {} : { higherIsBetter: true }),
          nameLabels: pNames,
          values: effectiveProducts.map((p) => {
            const cat = p.category.toLowerCase()
            if (cat === 'laptop') {
              return {
                primary: p.raw.battery_wh ? `${p.raw.battery_wh} Wh` : '—',
                ...(mixedBatteryUnits ? {} : { numericVal: p.raw.battery_wh ?? undefined }),
              }
            }
            return {
              primary: p.raw.battery_mah ? `${p.raw.battery_mah} mAh` : '—',
              ...(mixedBatteryUnits ? {} : { numericVal: p.raw.battery_mah ?? undefined }),
            }
          }),
        },
        osRow,
        wifiRow,
        bluetoothRow,
        priceRow,
        {
          label: t('spec.weight'),
          sublabel: t('spec.weight_body'),
          higherIsBetter: false,
          nameLabels: pNames,
          values: effectiveProducts.map((p) => {
            const cat = p.category.toLowerCase()
            if (cat === 'laptop') {
              return {
                primary: p.raw.weight_kg ? `${p.raw.weight_kg} kg` : '—',
                numericVal: p.raw.weight_kg ? p.raw.weight_kg * 1000 : undefined,
              }
            }
            return {
              primary: p.raw.weight_g ? `${p.raw.weight_g}g` : '—',
              numericVal: p.raw.weight_g ?? undefined,
            }
          }),
        },
      ]
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
        wifiRow,
        bluetoothRow,
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
        graphicsRow,
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
        wifiRow,
        bluetoothRow,
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
        wifiRow,
        bluetoothRow,
        priceRow,
      ]
    }

    // 기타 fallback (monitor 등)
    return [performanceRow, ramRow, storageRow, displayRow, osRow]
  }

  const specRows = buildSpecRows()

  const handleExportHTML = async () => {
    const rows = specRows
    const colStyle = `border: 1px solid #2a2a2a; padding: 12px 16px; vertical-align: top;`
    const headerCols = effectiveProducts.map((p) =>
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
        {error === 'no_points' && !loading && (
          <div className="mt-8 p-6 bg-surface border border-amber-500/30 rounded-card flex items-center gap-4">
            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">{t('compare.no_points_title')}</p>
              <p className="text-white/40 text-xs">{t('compare.no_points_desc')}</p>
            </div>
            <Link href="/mypage" className="flex-shrink-0 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
              {t('compare.no_points_cta')}
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
            {/* 자동 AI 비활성화 상태 + 미결과 + 로그인 → 수동 실행 버튼 */}
            {!autoAI && !loadingAI && !aiResult && session && !error && products.length >= 2 && (
              <div className="rounded-card border border-border bg-surface p-6 mb-8 text-center">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5 text-accent" />
                </div>
                <p className="text-white font-bold mb-1">{t('compare.auto_ai_off_title')}</p>
                <p className="text-white/40 text-sm mb-4">{t('compare.auto_ai_off_desc')}</p>
                <button
                  onClick={handleManualAI}
                  disabled={loadingAI}
                  className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-bold px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {t('compare.start_ai')}
                </button>
              </div>
            )}
            {sessionLoaded && !session && !loadingAI && !aiResult && !error && <AIPickLocked t={t} />}
            {!loadingAI && aiResult && (
              <>
                <AIPickBanner
                  winner={aiResult.winner}
                  reasoning={aiResult.summary}
                  onViewReasoning={() => setShowReasoning(true)}
                  t={t}
                />
              </>
            )}

            {/* 비교 테이블 */}
            <div id="spec-table" ref={compareTableRef} className="bg-surface border border-border rounded-card overflow-hidden mb-8">

              {/* ── 모바일 헤더: 가로 슬라이드 카드 ── */}
              <div ref={mobileHeaderRef} className="lg:hidden border-b border-border">
                <div className="flex overflow-x-auto gap-3 px-4 py-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                  {products.map((p, pi) => {
                    const ep = effectiveProducts[pi]
                    const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
                    const hasVariants = (p.variants?.length ?? 0) > 0
                    return (
                      <div key={p.id} className="flex-shrink-0 snap-start w-[52vw] min-w-[180px]">
                        {/* 이미지 */}
                        <div className="aspect-square rounded-2xl bg-surface-2 border border-border overflow-hidden flex items-center justify-center mb-3" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                          {p.image_url
                            ? <img src={imgUrl(p.image_url, 400)} alt={p.name} className="w-full h-full object-contain p-3" />
                            : <span className="text-xs text-white/20 font-bold">{p.brand}</span>
                          }
                        </div>
                        {/* 이름 */}
                        <Link href={`/product/${p.id}`} className="text-sm font-bold text-white/90 hover:text-accent line-clamp-2 leading-snug block mb-1">
                          {p.name}
                        </Link>
                        {ep.price_usd && (
                          <p className="text-xs text-white/40 mb-2">${Number(ep.price_usd).toLocaleString()}</p>
                        )}
                        {p.raw.amazon_url && (
                          <a
                            href={p.raw.amazon_url}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="flex items-center justify-center w-full py-1.5 rounded-lg"
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
                className="hidden lg:grid border-b border-border"
                style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}
              >
                <div className="p-3 lg:p-4 flex items-center">
                  <p className="text-[10px] lg:text-xs text-white/40 font-semibold">{t('compare.overview')}</p>
                </div>
                {products.map((p, pi) => {
                  const ep = effectiveProducts[pi]
                  const hasVariants = (p.variants?.length ?? 0) > 0
                  return (
                    <div key={p.id} className="p-2 lg:p-4 border-l border-border">
                      <ProductCard product={ep} />
                      {p.raw.amazon_url && (
                        <a
                          href={p.raw.amazon_url}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          onClick={(e) => e.stopPropagation()}
                          data-export-exclude="true"
                          className="mt-2 lg:mt-3 flex items-center justify-center gap-1.5 w-full py-2 lg:py-3 rounded-lg lg:rounded-xl transition-all hover:brightness-105 active:scale-95 select-none"
                          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/amazon-logo.svg" alt="Amazon" width={56} height={18} className="lg:w-[72px] lg:h-[22px]" style={{ display: 'block' }} />
                          <span className="hidden lg:inline" style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.02em' }}>{t('compare.buy_now')}</span>
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── 모델 선택 행 (variant 있는 제품이 하나라도 있을 때만) ── */}
              {products.some((p) => (p.variants?.length ?? 0) > 0) && (
                <div className="border-t border-border" data-export-exclude="true">
                  {/* 모바일 */}
                  <div className="lg:hidden">
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-semibold text-white/60">{t('compare.select_model')}</span>
                    </div>
                    {products.map((p, pi) => {
                      const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
                      const ep = effectiveProducts[pi]
                      const hasVariants = (p.variants?.length ?? 0) > 0
                      const baseLabel = [p.specs.cpu, p.specs.gpuName].filter(Boolean).join(' + ') || p.name
                      return (
                        <div key={pi} className="px-4 pt-2 pb-3 border-t border-border/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded bg-surface-2 border border-border overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                              {ep.image_url ? <img src={imgUrl(ep.image_url, 48)} alt={ep.name} className="w-full h-full object-contain" /> : <div className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: color }} />}
                            </div>
                            <p className="text-[12px] text-white/50 truncate flex-1">{p.name}</p>
                          </div>
                          {hasVariants ? (
                            <select
                              value={selectedVariantIds[pi] ?? ''}
                              onChange={(e) => {
                                if (e.target.value === '') {
                                  setSelectedVariantIds((prev) => { const n = { ...prev }; delete n[pi]; return n })
                                } else {
                                  setSelectedVariantIds((prev) => ({ ...prev, [pi]: e.target.value }))
                                }
                              }}
                              className="w-full rounded-lg px-3 py-2.5 text-[11px] font-semibold border bg-surface-2 outline-none cursor-pointer"
                              style={{ borderColor: `${color}60`, color }}
                            >
                              <option value="">{baseLabel}</option>
                              {p.variants!.map((v) => (
                                <option key={v.id} value={v.id}>{v.variant_name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* 데스크탑 */}
                  <div className="hidden lg:grid" style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}>
                    <div className="p-4 flex items-center">
                      <span className="text-sm font-semibold text-white">{t('compare.select_model')}</span>
                    </div>
                    {products.map((p, pi) => {
                      const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
                      const hasVariants = (p.variants?.length ?? 0) > 0
                      const baseLabel = [p.specs.cpu, p.specs.gpuName].filter(Boolean).join(' + ') || p.name
                      return (
                        <div key={pi} className="p-4 border-l border-border">
                          {hasVariants ? (
                            <select
                              value={selectedVariantIds[pi] ?? ''}
                              onChange={(e) => {
                                if (e.target.value === '') {
                                  setSelectedVariantIds((prev) => { const n = { ...prev }; delete n[pi]; return n })
                                } else {
                                  setSelectedVariantIds((prev) => ({ ...prev, [pi]: e.target.value }))
                                }
                              }}
                              className="w-full rounded-lg px-3 py-2.5 text-xs font-semibold border bg-surface-2 outline-none cursor-pointer"
                              style={{ borderColor: `${color}60`, color }}
                            >
                              <option value="">{baseLabel}</option>
                              {p.variants!.map((v) => (
                                <option key={v.id} value={v.id}>{v.variant_name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Overall Score row — DB 전체 상대 점수 */}
              {productScores && productScores.length >= 2 && (() => {
                const maxScore = Math.max(...productScores.map((s) => s.overall))
                return (
                  <div className="border-t border-border bg-surface-2/40">
                    {/* ── 모바일: 세로 나열 (SpecRow와 동일한 패턴) ── */}
                    <div className="lg:hidden">
                      <div className="px-4 pt-3 pb-2">
                        <span className="text-[10px] uppercase tracking-wider text-white/25">{t('compare.overall_score')}</span>
                      </div>
                      {productScores.map((s, i) => {
                        const isWinner = s.overall === maxScore
                        const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                        const p = effectiveProducts[i]
                        return (
                          <div key={i} className="px-4 pt-2.5 pb-3 border-t border-border/20" style={isWinner ? { backgroundColor: `${color}08` } : {}}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border overflow-hidden flex items-center justify-center flex-shrink-0" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                                {p?.image_url
                                  ? <img src={imgUrl(p.image_url, 56)} alt={p.name} className="w-full h-full object-contain p-0.5" />
                                  : <div className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: color }} />
                                }
                              </div>
                              <p className="text-[13px] text-white/50 leading-tight truncate flex-1">{p?.name ?? ''}</p>
                              {isWinner && <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>BEST</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[20px] font-black leading-none flex-shrink-0 w-9" style={{ color: isWinner ? color : 'rgba(255,255,255,0.85)' }}>
                                {s.overall}
                              </span>
                              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.overall}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* ── 데스크탑: 기존 그리드 ── */}
                    <div
                      className="hidden lg:grid"
                      style={{ gridTemplateColumns: `160px repeat(${products.length}, 1fr)` }}
                    >
                      <div className="p-3 lg:p-4 flex flex-col gap-0.5 justify-center">
                        <span className="text-[10px] lg:text-sm font-semibold text-white/60 lg:text-white">{t('compare.overall_score')}</span>
                      </div>
                      {productScores.map((s, i) => {
                        const isWinner = s.overall === maxScore
                        const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length]
                        return (
                          <div key={i} className="p-3 lg:p-4 border-l border-border transition-colors"
                            style={isWinner ? { backgroundColor: `${color}12` } : {}}>
                            <div className="flex items-baseline gap-1 mb-1.5 lg:mb-2">
                              <span className="text-xl lg:text-3xl font-black leading-none" style={{ color }}>
                                {s.overall}
                              </span>
                              <span className="text-[10px] lg:text-xs text-white/30 font-semibold">/ 100</span>
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
                // 숫자 값이 있는 행에서 winner 셀(들) 계산 — 동률 포함
                let winnerIndices: number[] = []
                if (row.higherIsBetter !== undefined) {
                  const nums = row.values.map((v) => {
                    const n = v.numericVal
                    return (n != null && !Number.isNaN(n)) ? n : null
                  })
                  const valid = nums.filter((n): n is number => n !== null)
                  if (valid.length >= 1) {
                    const best = row.higherIsBetter ? Math.max(...valid) : Math.min(...valid)
                    // 최솟값(lowerIsBetter)이 아닌 경우만 처리: 1등과 최하위 모두 같으면 배지 없음
                    const loserBest = row.higherIsBetter ? Math.min(...valid) : Math.max(...valid)
                    if (best !== loserBest || valid.length === 1) {
                      winnerIndices = nums.reduce<number[]>((acc, n, idx) => {
                        if (n === best) acc.push(idx)
                        return acc
                      }, [])
                    }
                  }
                }
                return (
                  <SpecRow
                    key={`${row.label}-${ri}`}
                    label={row.label}
                    sublabel={row.sublabel}
                    values={row.values}
                    barMax={row.barMax}
                    winnerIndices={winnerIndices}
                    colors={PRODUCT_COLORS}
                    rowIndex={ri}
                    nameLabels={row.nameLabels ?? effectiveProducts.map((p) => p.name)}
                    productImages={effectiveProducts.map((p) => p.image_url ? imgUrl(p.image_url, 60) : null)}
                    showNameOnDesktop={row.showNameOnDesktop}
                  />
                )
              })}
            </div>

            {/* 비교표 하단 광고 — 내보내기(이미지/PDF) 시 제외 */}
            {AD_HTML_INLINE && (
              <div className="mt-6" data-export-exclude="true">
                <AdBanner html={AD_HTML_INLINE} adWidth={728} adHeight={90} className="rounded-2xl overflow-hidden" />
              </div>
            )}

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

      {/* ── 모바일 하단 고정 바 — 헤더가 사라질 때만 표시 ── */}
      {!loading && products.length >= 2 && showBottomBar && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-2xl">
          <div className="flex overflow-x-auto px-3 py-3 gap-2.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {products.map((p, pi) => {
              const color = PRODUCT_COLORS[pi % PRODUCT_COLORS.length]
              return (
                <div key={p.id} className="flex items-center gap-2.5 flex-shrink-0 bg-surface-2 rounded-xl px-3 py-2.5" style={{ minWidth: 0, width: 'calc(50vw - 24px)', maxWidth: 200 }}>
                  {/* 썸네일 */}
                  <div
                    className="w-10 h-10 flex-shrink-0 rounded-lg bg-surface border border-border overflow-hidden flex items-center justify-center"
                    style={{ borderTopColor: color, borderTopWidth: 2 }}
                  >
                    {p.image_url
                      ? <img src={imgUrl(p.image_url, 80)} alt={p.name} className="w-full h-full object-contain p-0.5" />
                      : <span className="text-[7px] text-white/30 font-bold">{p.brand.slice(0, 3).toUpperCase()}</span>
                    }
                  </div>
                  {/* 제품명 + Amazon */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <p className="text-[12px] font-semibold text-white/70 leading-tight truncate">{p.name}</p>
                    {p.raw.amazon_url && (
                      <a
                        href={p.raw.amazon_url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="self-start flex items-center justify-center px-2 py-1 rounded"
                        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/amazon-logo.svg" alt="Amazon" width={44} height={14} style={{ display: 'block' }} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </>
  )
}
