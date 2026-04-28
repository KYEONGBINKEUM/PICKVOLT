'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Smartphone,
  Laptop,
  Tablet,
  Search,
  X,
  Heart,
  Pencil,
  GitCompare,
} from 'lucide-react'
import { useCompareCart } from '@/lib/compareCart'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { imgUrl } from '@/lib/utils'
import AdBanner from '@/components/AdBanner'

// 광고 코드 설정 (Vercel 환경변수로 주입)
// NEXT_PUBLIC_AD_BANNER_TOP    → 728×90 상단 배너 (데스크탑용)
// NEXT_PUBLIC_AD_BANNER_INLINE → 반응형 인라인 배너 (카드 사이사이)
const AD_HTML_TOP    = process.env.NEXT_PUBLIC_AD_BANNER_TOP    ?? ''
const AD_HTML_INLINE = process.env.NEXT_PUBLIC_AD_BANNER_INLINE ?? ''

// 첫 번째 광고: 10개 후 / 이후: 20개마다
function shouldShowAd(idx: number): boolean {
  if (idx === 9) return true              // 10번째 뒤
  if (idx > 9 && (idx - 9) % 20 === 0) return true  // 이후 20개마다
  return false
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  brand: string
  category: string
  price_usd: number | null
  image_url: string | null
  performance_score: number
  cpu_name: string | null
  gpu_name: string | null
  ram_gb: number | null
  os: string | null
  display_inch: number | null
  display_hz: number | null
  ppi: number | null
  battery_mah: number | null
  battery_wh: number | null
  battery_hours: number | null
  weight_g: number | null
  weight_kg: number | null
  stylus_support: boolean | null
  launch_year: number | null
  variants: {
    id: string
    variant_name: string
    price_usd: number | null
    ram_gb: string | null
    storage_gb: string | null
    cpu_name: string | null
    gpu_name: string | null
  }[]
}

interface ApiResponse {
  results: Product[]
  total: number
  brands: string[]
  page: number
  limit: number
}

const CATEGORY_ICON: Record<string, typeof Smartphone> = {
  smartphone: Smartphone,
  laptop:     Laptop,
  tablet:     Tablet,
}

const CATEGORY_SUBLABEL: Record<string, string> = {
  smartphone: 'Smartphones',
  laptop:     'Laptops',
  tablet:     'Tablets',
}

// ─── Filters interface ────────────────────────────────────────────────────────

interface Filters {
  brands: string[]
  sort: string
  q: string
  os: string
  priceMin: number
  priceMax: number
  ramMin: number
  ramMax: number
  displayMin: number
  displayMax: number
  batteryMin: number
  batteryMax: number
}

const DEFAULT_FILTERS: Filters = {
  brands: [],
  sort: 'performance',
  q: '',
  os: '',
  priceMin: 0,
  priceMax: 5000,
  ramMin: 0,
  ramMax: 64,
  displayMin: 0,
  displayMax: 20,
  batteryMin: 0,
  batteryMax: 10000,
}

// ─── Product Card (horizontal layout) ────────────────────────────────────────

function ProductCard({
  product,
  wishlisted,
  onWishlistToggle,
  isAdmin,
  maxScore,
}: {
  product: Product
  wishlisted: boolean
  onWishlistToggle: (productId: string, e: React.MouseEvent) => void
  isAdmin: boolean
  maxScore: number
}) {
  const { t } = useI18n()
  const { cart, add, remove } = useCompareCart()
  const inCart   = cart.some((i) => i.id === product.id)
  const cartFull = cart.length >= 4

  const toggleCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) remove(product.id)
    else if (!cartFull) add({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      variantId: current.id ?? undefined,
    })
  }

  // Variant carousel
  const allVariants = [
    { id: undefined, variant_name: null, price_usd: product.price_usd, cpu_name: product.cpu_name, gpu_name: product.gpu_name, ram_gb: product.ram_gb ? String(product.ram_gb) : null, storage_gb: null },
    ...product.variants,
  ]
  const [variantIdx, setVariantIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [animDir, setAnimDir] = useState<'left' | 'right'>('left')
  const current = allVariants[variantIdx]
  const hasVariants = allVariants.length > 1

  const switchVariant = (dir: 'prev' | 'next') => {
    const d = dir === 'next' ? 'left' : 'right'
    setAnimDir(d)
    setAnimating(true)
    setTimeout(() => {
      setVariantIdx((i) => dir === 'next' ? (i + 1) % allVariants.length : (i - 1 + allVariants.length) % allVariants.length)
      setAnimating(false)
    }, 160)
  }

  const goPrev = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); switchVariant('prev') }
  const goNext = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); switchVariant('next') }

  // 2-column grid rows (카테고리별 분기)
  const batteryCell = {
    label: t('cat.spec_battery'),
    value: product.battery_mah
      ? `${product.battery_mah.toLocaleString()} mAh`
      : product.battery_wh
      ? `${product.battery_wh} Wh`
      : null,
  }
  const weightCell = {
    label: t('cat.spec_weight'),
    value: product.weight_kg
      ? `${product.weight_kg} kg`
      : product.weight_g
      ? `${product.weight_g} g`
      : null,
  }

  const displayCell = {
    label: t('cat.spec_display'),
    value: product.display_inch
      ? [`${product.display_inch}"`, product.display_hz ? `(${product.display_hz}Hz)` : null].filter(Boolean).join(' ')
      : null,
  }

  const gpuCell = { label: 'GPU', value: current.gpu_name ?? null }

  // Mobile: laptop → CPU, RAM, GPU, Display / others → CPU, RAM, Display, Battery
  const mobileCells = product.category === 'laptop'
    ? [
        { label: 'CPU', value: current.cpu_name ?? null },
        { label: t('spec.ram'), value: current.ram_gb ? `${current.ram_gb}GB` : null },
        gpuCell,
        displayCell,
      ]
    : [
        { label: 'CPU', value: current.cpu_name ?? null },
        { label: t('spec.ram'), value: current.ram_gb ? `${current.ram_gb}GB` : null },
        displayCell,
        batteryCell,
      ]


  const score = product.performance_score
  const scorePercent = Math.min(100, Math.round((score / maxScore) * 100))

  return (
    <Link href={`/product/${product.id}`} className="group block h-full relative">
      {/* Stack effect */}
      {hasVariants && (
        <>
          <div className="absolute inset-x-4 bottom-[-6px] h-full rounded-2xl bg-surface border border-white/[0.04]" />
          <div className="absolute inset-x-2 bottom-[-3px] h-full rounded-2xl bg-surface border border-white/[0.07]" />
        </>
      )}

      {/* Variant arrows — on card edges */}
      {hasVariants && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/75 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white/80 hover:bg-black/95 hover:border-white/50 hover:text-white transition-all shadow-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/75 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white/80 hover:bg-black/95 hover:border-white/50 hover:text-white transition-all shadow-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      <div
        className={`relative z-10 bg-surface border rounded-2xl overflow-hidden flex flex-row h-full transition-all duration-[160ms] hover:shadow-lg hover:shadow-black/20
          ${hasVariants ? 'border-white/10 hover:border-white/20' : 'border-border hover:border-white/15'}
          ${animating
            ? animDir === 'left'
              ? '-translate-x-2 opacity-0 scale-[0.98]'
              : 'translate-x-2 opacity-0 scale-[0.98]'
            : 'translate-x-0 opacity-100 scale-100'
          }`}
      >

        {/* Image — left */}
        <div className="relative w-28 sm:w-36 flex-shrink-0 bg-surface-2 flex items-center justify-center overflow-hidden self-stretch min-h-[10rem]">
          {product.image_url ? (
            <Image
              src={imgUrl(product.image_url, 288)}
              alt={product.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              sizes="144px"
            />
          ) : (
            <span className="text-3xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
          )}
          {/* Score badge — bottom-center */}
          {score > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <span className="text-[10px] font-bold text-white tabular-nums">{Math.round(score)}</span>
            </div>
          )}
        </div>

        {/* Action buttons — icon-only, absolute top-right */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          {/* Add to Compare */}
          <button
            onClick={toggleCart}
            disabled={!inCart && cartFull}
            title={inCart ? t('cat.in_compare') : cartFull ? t('cat.compare_full') : t('cat.add_compare')}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
              inCart
                ? 'bg-accent/20 border border-accent/50 text-accent'
                : cartFull
                ? 'bg-surface-2/90 border border-border text-white/20 cursor-not-allowed'
                : 'bg-accent/20 border border-accent/50 text-accent hover:bg-accent/35'
            }`}
          >
            {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          {/* Wishlist */}
          <button
            onClick={(e) => onWishlistToggle(product.id, e)}
            title={wishlisted ? t('wishlist.remove') : t('wishlist.add')}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-all ${
              wishlisted
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                : 'bg-surface-2/90 border-border text-white/40 hover:text-white/70 hover:border-white/20'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-red-400' : ''}`} />
          </button>

          {/* Admin edit */}
          {isAdmin && (
            <button
              onClick={(e) => { e.preventDefault(); window.location.href = `/admin/products/${product.id}` }}
              title={t('admin.edit')}
              className="flex items-center justify-center w-7 h-7 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Content — right */}
        <div className="flex flex-col justify-between flex-1 min-w-0 p-4 sm:p-5 gap-3">
          <div>
            {/* Always pad right to avoid overlap with the 2 icon buttons (7×2 + gap = ~62px) */}
            <h3 className="text-[15px] md:text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors pr-16">
              {product.name}
            </h3>
            {current.price_usd && (
              <p className="text-[13px] md:text-sm font-black text-accent mt-1">
                ${Number(current.price_usd).toLocaleString()}
              </p>
            )}
          </div>

          {/* Spec grid: 4 cells (CPU, RAM, display, battery/gpu) */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {mobileCells.map((s, i) => (
              <div key={i}>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">{s.label}</p>
                <p className={`text-[12px] md:text-[13px] font-semibold ${s.value ? 'text-white/75' : 'text-white/20'}`}>
                  {s.value ?? '–'}
                </p>
              </div>
            ))}
          </div>

          {/* Performance bar */}
          {score > 0 && (
            <div className="h-0.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Filter Section ───────────────────────────────────────────────────────────

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{title}</p>
        <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </div>
  )
}

// ─── Range Filter ─────────────────────────────────────────────────────────────

function RangeFilter({
  title,
  absMin,
  absMax,
  valueMin,
  valueMax,
  onChange,
  step = 1,
  format = (v: number) => String(v),
  defaultOpen = true,
}: {
  title: string
  absMin: number
  absMax: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  step?: number
  format?: (v: number) => string
  defaultOpen?: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'min' | 'max' | null>(null)
  const pct = (v: number) => ((v - absMin) / (absMax - absMin)) * 100

  const clampToStep = (v: number) => Math.round(v / step) * step

  const valueFromClientX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return clampToStep(absMin + ratio * (absMax - absMin))
  }

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return
    e.preventDefault()
    trackRef.current.setPointerCapture(e.pointerId)
    const val = valueFromClientX(e.clientX)
    const distMin = Math.abs(val - valueMin)
    const distMax = Math.abs(val - valueMax)
    draggingRef.current = distMin <= distMax ? 'min' : 'max'
    // 즉시 값 이동
    if (draggingRef.current === 'min') onChange(Math.min(Math.max(absMin, val), valueMax - step), valueMax)
    else onChange(valueMin, Math.max(Math.min(absMax, val), valueMin + step))
  }

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const val = valueFromClientX(e.clientX)
    if (draggingRef.current === 'min') onChange(Math.min(Math.max(absMin, val), valueMax - step), valueMax)
    else onChange(valueMin, Math.max(Math.min(absMax, val), valueMin + step))
  }

  const handleTrackPointerUp = () => { draggingRef.current = null }

  return (
    <FilterSection title={title} defaultOpen={defaultOpen}>
      <div className="px-1 pb-1">
        {/* Dual range slider — 커스텀 드래그 (native input z-index 문제 해결) */}
        <div className="relative pt-3 pb-4 mx-1 cursor-pointer select-none"
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
        >
          {/* 트랙 */}
          <div className="relative h-1 bg-surface-2 rounded-full">
            <div
              className="absolute h-full bg-accent rounded-full"
              style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%` }}
            />
          </div>
          {/* Min thumb */}
          <div
            className="absolute w-4 h-4 bg-white rounded-full border-2 border-accent top-1 -translate-x-1/2 shadow-md"
            style={{ left: `${pct(valueMin)}%` }}
          />
          {/* Max thumb */}
          <div
            className="absolute w-4 h-4 bg-white rounded-full border-2 border-accent top-1 -translate-x-1/2 shadow-md"
            style={{ left: `${pct(valueMax)}%` }}
          />
        </div>

        {/* Min / Max inputs */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            value={valueMin}
            min={absMin} max={valueMax - step} step={step}
            onChange={(e) => {
              const v = Math.max(absMin, Math.min(Number(e.target.value), valueMax - step))
              onChange(v, valueMax)
            }}
            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-accent/50"
          />
          <span className="text-white/30 text-xs flex-shrink-0">–</span>
          <input
            type="number"
            value={valueMax}
            min={valueMin + step} max={absMax} step={step}
            onChange={(e) => {
              const v = Math.min(absMax, Math.max(Number(e.target.value), valueMin + step))
              onChange(valueMin, v)
            }}
            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-accent/50"
          />
        </div>
        <p className="text-center text-[10px] text-white/20 mt-1.5">
          {format(valueMin)} — {format(valueMax)}
        </p>
      </div>
    </FilterSection>
  )
}

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
        active ? 'bg-accent/15 text-accent font-semibold' : 'text-white/50 hover:text-white hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({
  category,
  categoryLabel,
  availableBrands,
  availableOsList,
  filters,
  dataRanges,
  onChange,
}: {
  category: string
  categoryLabel: string
  availableBrands: string[]
  availableOsList: string[]
  filters: Filters
  dataRanges: { priceMax: number; ramMax: number; displayMax: number; batteryMax: number }
  onChange: (f: Filters) => void
}) {
  const { t } = useI18n()

  const SORT_OPTIONS = [
    { value: 'performance', label: t('cat.sort_performance') },
    { value: 'newest',      label: t('cat.sort_newest')      },
    { value: 'price_asc',   label: t('cat.sort_price_asc')   },
    { value: 'price_desc',  label: t('cat.sort_price_desc')  },
  ]

  const isDefault = (f: Filters) =>
    f.brands.length === 0 &&
    !f.q && !f.os &&
    f.priceMin === DEFAULT_FILTERS.priceMin && f.priceMax === DEFAULT_FILTERS.priceMax &&
    f.ramMin === DEFAULT_FILTERS.ramMin && f.ramMax === DEFAULT_FILTERS.ramMax &&
    f.displayMin === DEFAULT_FILTERS.displayMin && f.displayMax === DEFAULT_FILTERS.displayMax &&
    f.batteryMin === DEFAULT_FILTERS.batteryMin && f.batteryMax === DEFAULT_FILTERS.batteryMax

  const toggleBrand = (brand: string) => {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand]
    onChange({ ...filters, brands: next })
  }

  return (
    <aside className="w-full space-y-1.5">

      {/* Search */}
      <div className="bg-surface border border-border rounded-2xl p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder={t('cat.search_placeholder').replace('{label}', categoryLabel)}
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 transition-colors"
          />
          {filters.q && (
            <button onClick={() => onChange({ ...filters, q: '' })} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-white/30 hover:text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <FilterSection title={t('cat.filter_sort')}>
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              active={filters.sort === opt.value}
              onClick={() => onChange({ ...filters, sort: opt.value })}
            />
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <RangeFilter
        title={t('cat.filter_price')}
        absMin={0} absMax={dataRanges.priceMax}
        valueMin={filters.priceMin} valueMax={filters.priceMax}
        step={50}
        format={(v) => `$${v.toLocaleString()}`}
        onChange={(min, max) => onChange({ ...filters, priceMin: min, priceMax: max })}
      />

      {/* Brand */}
      {availableBrands.length > 0 && (
        <FilterSection title={t('cat.filter_brand')}>
          <div className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
            {availableBrands.map((brand) => {
              const checked = filters.brands.includes(brand)
              return (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    checked ? 'text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                      checked ? 'bg-accent border-accent' : 'border-border'
                    }`}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-black" />}
                  </span>
                  <span className="truncate">{brand}</span>
                </button>
              )
            })}
          </div>
        </FilterSection>
      )}

      {/* RAM */}
      <RangeFilter
        title={t('cat.filter_min_ram')}
        absMin={0} absMax={dataRanges.ramMax}
        valueMin={filters.ramMin} valueMax={filters.ramMax}
        step={2}
        format={(v) => `${v}GB`}
        onChange={(min, max) => onChange({ ...filters, ramMin: min, ramMax: max })}
      />

      {/* Display size */}
      <RangeFilter
        title={t('cat.filter_display')}
        absMin={0} absMax={dataRanges.displayMax}
        valueMin={filters.displayMin} valueMax={filters.displayMax}
        step={0.1}
        format={(v) => `${v.toFixed(1)}"`}
        onChange={(min, max) => onChange({ ...filters, displayMin: min, displayMax: max })}
        defaultOpen={false}
      />

      {/* OS */}
      {availableOsList.length > 0 && (
        <FilterSection title={t('cat.filter_os')} defaultOpen={false}>
          <div className="space-y-0.5">
            <OptionRow
              label={t('cat.filter_os_any')}
              active={filters.os === ''}
              onClick={() => onChange({ ...filters, os: '' })}
            />
            {availableOsList.map((os) => (
              <OptionRow
                key={os}
                label={os}
                active={filters.os === os}
                onClick={() => onChange({ ...filters, os })}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Battery (smartphone & tablet only) */}
      {(category === 'smartphone' || category === 'tablet') && (
        <RangeFilter
          title={t('cat.filter_battery')}
          absMin={0} absMax={dataRanges.batteryMax}
          valueMin={filters.batteryMin} valueMax={filters.batteryMax}
          step={100}
          format={(v) => `${v.toLocaleString()} mAh`}
          onChange={(min, max) => onChange({ ...filters, batteryMin: min, batteryMax: max })}
          defaultOpen={false}
        />
      )}

      {/* Reset */}
      {!isDefault(filters) && (
        <button
          onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-white/40 hover:text-white transition-colors border border-border hover:border-white/20"
        >
          <X className="w-3.5 h-3.5" />
          {t('cat.filter_reset')}
        </button>
      )}
    </aside>
  )
}

// ─── OS 대분류 매핑 ───────────────────────────────────────────────────────────

const OS_GROUP_MAP: [RegExp, string][] = [
  [/android/i,              'Android'],
  [/ipad\s*os|ipados/i,     'iPadOS'],
  [/ios/i,                  'iOS'],
  [/windows/i,              'Windows'],
  [/mac\s*os|macos/i,       'macOS'],
  [/chrome\s*os|chromeos/i, 'ChromeOS'],
  [/harmony/i,              'HarmonyOS'],
  [/linux/i,                'Linux'],
]

function osGroup(os: string): string {
  for (const [pattern, label] of OS_GROUP_MAP) {
    if (pattern.test(os)) return label
  }
  return os  // 매핑 없으면 원본 그대로
}

// ─── Client-side filter logic ─────────────────────────────────────────────────

function applyClientFilters(products: Product[], filters: Filters): Product[] {
  return products.filter((p) => {
    // Brand
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false

    // Search
    if (filters.q) {
      const q = filters.q.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) return false
    }

    // Price
    const price = p.price_usd ?? 0
    if (price > 0 && (price < filters.priceMin || price > filters.priceMax)) return false

    // RAM — ram_gb는 "8" 또는 "8, 16" 같은 TEXT. 모든 옵션을 파싱해서 비교
    if (p.ram_gb != null) {
      const ramOpts = String(p.ram_gb).split(',').map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n))
      if (ramOpts.length > 0) {
        const minRam = Math.min(...ramOpts)
        const maxRam = Math.max(...ramOpts)
        // ramMin: 가장 낮은 옵션도 최소값 미만이면 제외
        if (maxRam < filters.ramMin) return false
        // ramMax: 가장 낮은 옵션이 최대값 초과면 제외
        if (minRam > filters.ramMax) return false
      }
    }

    // Display
    const disp = p.display_inch ?? 0
    if (disp > 0 && (disp < filters.displayMin || disp > filters.displayMax)) return false

    // OS — 대분류로 비교
    if (filters.os && (!p.os || osGroup(p.os) !== filters.os)) return false

    // Battery
    const bat = p.battery_mah ?? 0
    if (bat > 0 && (bat < filters.batteryMin || bat > filters.batteryMax)) return false

    return true
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export default function CategoryClient({ category }: { category: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const Icon = CATEGORY_ICON[category]
  const categoryLabel = t(`cat.${category}` as Parameters<typeof t>[0])

  // Compare cart (for mobile bottom tray)
  const { cart: compareCart, clear: clearCart, remove: removeFromCart } = useCompareCart()
  const handleMobileCompare = () => {
    const ids = compareCart.map((p) => p.id).join(',')
    const variants = compareCart.map((p) => p.variantId ?? '').join(',')
    const hasVariants = compareCart.some((p) => p.variantId)
    clearCart()
    router.push(`/compare?ids=${ids}${hasVariants ? `&variants=${variants}` : ''}`)
  }

  const [allProducts,     setAllProducts]     = useState<Product[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [availableOsList, setAvailableOsList] = useState<string[]>([])
  const [categoryMaxScore, setCategoryMaxScore] = useState<number>(1)
  const [loading,         setLoading]         = useState(true)
  const [serverPage,      setServerPage]      = useState(1)
  const [hasMoreServer,   setHasMoreServer]   = useState(false)
  const [isLoadingMore,   setIsLoadingMore]   = useState(false)
  const [mobileSheet,     setMobileSheet]     = useState(false)
  const [mobileTrayOpen,  setMobileTrayOpen]  = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Auth / Wishlist ──────────────────────────────────────────────────────────
  const [authToken,     setAuthToken]     = useState<string | null>(null)
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set())
  const [isAdmin,       setIsAdmin]       = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setAuthToken(session.access_token)
      const email = (session.user?.email ?? '').toLowerCase()
      if (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)) setIsAdmin(true)
      fetch('/api/wishlist', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((json) => {
          setWishlistedIds(new Set((json.wishlist ?? []).map((w: { product_id: string }) => w.product_id)))
        })
    })
  }, [])

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!authToken) { window.location.href = '/login'; return }
    const wasWishlisted = wishlistedIds.has(productId)
    setWishlistedIds((prev) => {
      const next = new Set(prev)
      if (wasWishlisted) next.delete(productId)
      else next.add(productId)
      return next
    })
    if (wasWishlisted) {
      await fetch(`/api/wishlist?product_id=${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      })
    } else {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ product_id: productId }),
      })
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // 바텀시트 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (mobileSheet) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileSheet])
  const [dataRanges, setDataRanges] = useState({
    priceMax: DEFAULT_FILTERS.priceMax,
    ramMax: DEFAULT_FILTERS.ramMax,
    displayMax: DEFAULT_FILTERS.displayMax,
    batteryMax: DEFAULT_FILTERS.batteryMax,
  })

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const PAGE_SIZE = 30

  const fetchProductsPage = useCallback(async (page: number, reset: boolean) => {
    if (reset) setLoading(true)
    else setIsLoadingMore(true)
    try {
      const params = new URLSearchParams({ category, sort: filters.sort, page: String(page), limit: String(PAGE_SIZE) })
      if (filters.brands.length === 1) params.set('brand', filters.brands[0])
      if (filters.q)                   params.set('q', filters.q)

      const res  = await fetch(`/api/products/list?${params}`)
      const json: ApiResponse = await res.json()
      const results: Product[] = json.results ?? []

      if (reset) {
        setAllProducts(results)
        const maxScore = Math.max(1, ...results.map((p) => p.performance_score ?? 0))
        setCategoryMaxScore(maxScore)
        setAvailableBrands(json.brands ?? [])

        const osValues = Array.from(new Set(
          results.map((p) => p.os).filter(Boolean).map((os) => osGroup(os as string))
        )).sort()
        setAvailableOsList(osValues)

        // 검색(q)이 활성화된 상태에서는 data ranges를 재계산하지 않음
        // → 검색 결과가 적을 때 슬라이더 absMax가 줄어들어 thumb이 범위 밖으로 튀어나가는 버그 방지
        if (!filters.q) {
          const maxPrice   = Math.ceil(Math.max(0, ...results.map((p) => p.price_usd   ?? 0)) / 50)  * 50  || DEFAULT_FILTERS.priceMax
          const allRamVals = results.flatMap((p) =>
            p.ram_gb != null
              ? String(p.ram_gb).split(',').map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n))
              : []
          )
          const maxRam     = allRamVals.length > 0
            ? Math.ceil(Math.max(0, ...allRamVals) / 2) * 2
            : DEFAULT_FILTERS.ramMax
          const maxDisplay = Math.ceil(Math.max(0, ...results.map((p) => p.display_inch ?? 0)) * 10)  / 10  || DEFAULT_FILTERS.displayMax
          const maxBattery = Math.ceil(Math.max(0, ...results.map((p) => p.battery_mah  ?? 0)) / 100) * 100 || DEFAULT_FILTERS.batteryMax

          setDataRanges({ priceMax: maxPrice, ramMax: maxRam, displayMax: maxDisplay, batteryMax: maxBattery })
          setFilters((prev) => ({
            ...prev,
            priceMax:   prev.priceMax   === DEFAULT_FILTERS.priceMax   ? maxPrice   : prev.priceMax,
            ramMax:     prev.ramMax     === DEFAULT_FILTERS.ramMax     ? maxRam     : prev.ramMax,
            displayMax: prev.displayMax === DEFAULT_FILTERS.displayMax ? maxDisplay : prev.displayMax,
            batteryMax: prev.batteryMax === DEFAULT_FILTERS.batteryMax ? maxBattery : prev.batteryMax,
          }))
        }
      } else {
        setAllProducts((prev) => [...prev, ...results])
      }

      setHasMoreServer(results.length === PAGE_SIZE)
      setServerPage(page)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [category, filters.sort, filters.brands, filters.q])

  // Re-fetch from page 1 when primary filter keys change
  useEffect(() => {
    fetchProductsPage(1, true)
  }, [fetchProductsPage])

  // Infinite scroll: load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreServer && !isLoadingMore && !loading) {
          fetchProductsPage(serverPage + 1, false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading, isLoadingMore, hasMoreServer, serverPage, fetchProductsPage])

  const filtered  = applyClientFilters(allProducts, filters)
  const total     = filtered.length
  const products  = filtered

  const hasFilters =
    filters.brands.length > 0 || !!filters.q || !!filters.os ||
    filters.priceMin > DEFAULT_FILTERS.priceMin || filters.priceMax < DEFAULT_FILTERS.priceMax ||
    filters.ramMin > DEFAULT_FILTERS.ramMin || filters.ramMax < DEFAULT_FILTERS.ramMax ||
    filters.displayMin > DEFAULT_FILTERS.displayMin || filters.displayMax < DEFAULT_FILTERS.displayMax ||
    filters.batteryMin > DEFAULT_FILTERS.batteryMin || filters.batteryMax < DEFAULT_FILTERS.batteryMax

  if (!Icon) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/30">{t('cat.empty')}</p>
      </div>
    )
  }

  const [catDropOpen, setCatDropOpen] = useState(false)

  const ALL_CATEGORIES = [
    { slug: 'smartphone', label: t('cat.smartphone') },
    { slug: 'laptop',     label: t('cat.laptop')     },
    { slug: 'tablet',     label: t('cat.tablet')     },
  ]

  return (
    <div className="pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Category switcher */}
        <div className="relative">
          <button
            onClick={() => setCatDropOpen((v) => !v)}
            className="flex items-center gap-1.5 group"
          >
            <h1 className="text-lg md:text-2xl font-black text-white group-hover:text-accent transition-colors">
              {categoryLabel}
            </h1>
            <ChevronDown className={`w-4 h-4 text-white/40 group-hover:text-accent transition-all duration-200 ${catDropOpen ? 'rotate-180' : ''}`} />
          </button>

          {catDropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCatDropOpen(false)} />
              <div className="absolute top-full left-0 mt-2 z-20 bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl min-w-[140px]">
                {ALL_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setCatDropOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                      cat.slug === category
                        ? 'bg-accent/10 text-accent'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat.slug === category && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                    {cat.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="text-sm text-white/30 tabular-nums">
          {loading ? '–' : t('cat.count').replace('{n}', total.toLocaleString())}
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-5 items-start">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block sticky top-24 w-56 xl:w-64 flex-shrink-0">
          <FilterSidebar
            category={category}
            categoryLabel={categoryLabel}
            availableBrands={availableBrands}
            availableOsList={availableOsList}
            filters={filters}
            dataRanges={dataRanges}
            onChange={(f) => setFilters(f)}
          />
        </div>

        {/* Product list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse flex min-h-[8rem]">
                  <div className="w-28 bg-surface-2 flex-shrink-0" />
                  <div className="flex-1 p-4 space-y-2">
                    <div className="h-2 bg-surface-2 rounded w-1/4" />
                    <div className="h-3 bg-surface-2 rounded w-3/4" />
                    <div className="h-2 bg-surface-2 rounded w-1/3" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-6 bg-surface-2 rounded w-16" />
                      <div className="h-6 bg-surface-2 rounded w-16" />
                      <div className="h-6 bg-surface-2 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Icon className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm">
                {hasFilters ? t('cat.empty_filter') : t('cat.empty')}
              </p>
              {hasFilters && (
                <button
                  onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
                  className="mt-4 text-xs text-accent hover:underline"
                >
                  {t('cat.reset_filters')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                {products.map((product, idx) => (
                  <>
                    <ProductCard
                      key={product.id}
                      product={product}
                      wishlisted={wishlistedIds.has(product.id)}
                      onWishlistToggle={toggleWishlist}
                      isAdmin={isAdmin}
                      maxScore={categoryMaxScore}
                    />
                    {/* 인라인 배너: 10개 후 첫 노출, 이후 20개마다 */}
                    {AD_HTML_INLINE && shouldShowAd(idx) && idx < products.length - 1 && (
                      <div key={`ad-${idx}`} className="col-span-full w-full">
                        <AdBanner html={AD_HTML_INLINE} adWidth={728} adHeight={90} className="rounded-2xl overflow-hidden" />
                      </div>
                    )}
                  </>
                ))}
              </div>

              {/* 무한 스크롤 sentinel */}
              <div ref={sentinelRef} className="h-10 mt-6 flex items-center justify-center">
                {(hasMoreServer || isLoadingMore) && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 모바일 미니 트레이 (하단 바 위에 슬라이드업) ── */}
      {mobileTrayOpen && compareCart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 lg:hidden mx-4 animate-slide-up">
          <div className="bg-surface-2/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <GitCompare className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-bold text-white">
                  {t('tray.comparing').replace('{n}', String(compareCart.length))}
                </span>
              </div>
              <button onClick={clearCart} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                {t('tray.clear_all')}
              </button>
            </div>
            <div className="p-3 space-y-2">
              {compareCart.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-white/30">{p.brand}</p>
                  </div>
                  <button onClick={() => removeFromCart(p.id)} className="text-white/30 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={handleMobileCompare}
                disabled={compareCart.length < 2}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                  compareCart.length >= 2
                    ? 'bg-accent hover:bg-accent/90 text-white'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {compareCart.length >= 2
                  ? t('tray.compare_n').replace('{n}', String(compareCart.length))
                  : t('tray.add_more')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일 플로팅 버튼 바 ── */}
      <div className="fixed bottom-6 left-0 right-0 z-30 lg:hidden flex items-center justify-center gap-2 px-4 pointer-events-none">

        {/* 비교 트레이 토글 버튼 */}
        <button
          onClick={() => setMobileTrayOpen((v) => !v)}
          className="pointer-events-auto flex items-center gap-2 bg-surface-2/95 backdrop-blur-md border border-border rounded-full px-4 py-2.5 shadow-xl hover:border-white/20 transition-all"
        >
          <GitCompare className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-sm font-bold text-white">{compareCart.length}</span>
          <span className="text-xs text-white/40">{t('tray.in_tray')}</span>
          {mobileTrayOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            : <ChevronUp className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          }
        </button>

        {/* 필터 버튼 */}
        <button
          onClick={() => setMobileSheet(true)}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold shadow-xl transition-all ${
            hasFilters
              ? 'bg-accent/15 border-accent/40 text-accent backdrop-blur-md'
              : 'bg-surface-2/95 border-border text-white/70 hover:border-white/20 backdrop-blur-md'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {t('cat.filter_toggle')}
          {hasFilters && (
            <span className="bg-accent text-black text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
              {[filters.brands.length > 0, !!filters.q, !!filters.os,
                filters.priceMin > DEFAULT_FILTERS.priceMin || filters.priceMax < dataRanges.priceMax,
                filters.ramMin > DEFAULT_FILTERS.ramMin || filters.ramMax < dataRanges.ramMax,
              ].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ── 모바일 바텀시트 오버레이 ── */}
      {mobileSheet && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSheet(false)}
        />
      )}

      {/* ── 모바일 바텀시트 ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background rounded-t-3xl border-t border-border shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${
          mobileSheet ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 핸들 */}
        <div className="flex-shrink-0 pt-3 pb-2 flex items-center justify-center">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3 border-b border-border">
          <p className="font-bold text-white">{t('cat.filter_toggle')}</p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                {t('cat.filter_reset')}
              </button>
            )}
            <button onClick={() => setMobileSheet(false)} className="text-white/40 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <FilterSidebar
            category={category}
            categoryLabel={categoryLabel}
            availableBrands={availableBrands}
            availableOsList={availableOsList}
            filters={filters}
            dataRanges={dataRanges}
            onChange={(f) => setFilters(f)}
          />
        </div>

        {/* 적용 버튼 */}
        <div className="flex-shrink-0 px-5 pt-3 pb-6 border-t border-border">
          <button
            onClick={() => setMobileSheet(false)}
            className="w-full py-3.5 rounded-2xl bg-accent text-black font-bold text-sm transition-colors hover:bg-accent/90"
          >
            {loading ? '–' : t('cat.count').replace('{n}', total.toLocaleString())} {t('cat.view_results')}
          </button>
        </div>
      </div>
    </div>
  )
}
