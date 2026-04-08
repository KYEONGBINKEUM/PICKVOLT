'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Check,
  Smartphone,
  Laptop,
  Tablet,
  Search,
  X,
} from 'lucide-react'
import { useCompareCart } from '@/lib/compareCart'
import { useI18n } from '@/lib/i18n'

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
  ram_gb: number | null
  os: string | null
  display_inch: number | null
  ppi: number | null
  battery_mah: number | null
  battery_wh: number | null
  battery_hours: number | null
  weight_g: number | null
  weight_kg: number | null
  stylus_support: boolean | null
  launch_year: number | null
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

const RAM_OPTIONS   = [0, 4, 8, 12, 16, 32]

// ─── Filters interface ────────────────────────────────────────────────────────

interface Filters {
  brands: string[]
  minRam: number
  sort: string
  q: string
  priceRange: string   // 'any' | 'under500' | '500_1000' | '1000_1500' | 'over1500'
  os: string           // '' = any
  displayRange: string // 'any' | 'small' | 'mid' | 'large'
  batteryMin: number   // 0 = any
}

const DEFAULT_FILTERS: Filters = {
  brands: [],
  minRam: 0,
  sort: 'performance',
  q: '',
  priceRange: 'any',
  os: '',
  displayRange: 'any',
  batteryMin: 0,
}

// ─── Product Card (horizontal layout) ────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n()
  const { cart, add, remove } = useCompareCart()
  const inCart   = cart.some((i) => i.id === product.id)
  const cartFull = cart.length >= 4

  const toggleCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) remove(product.id)
    else if (!cartFull) add({ id: product.id, name: product.name, brand: product.brand, category: product.category })
  }

  // 2-column grid rows
  const specGrid: [{ label: string; value: string | null }, { label: string; value: string | null }][] = [
    [
      { label: 'CPU', value: product.cpu_name ?? null },
      { label: t('spec.ram'), value: product.ram_gb ? `${product.ram_gb}GB` : null },
    ],
    [
      { label: t('cat.spec_display'), value: product.display_inch ? `${product.display_inch}"` : null },
      { label: t('cat.spec_ppi'),     value: product.ppi           ? `${product.ppi} ppi`       : null },
    ],
    [
      {
        label: t('cat.spec_battery'),
        value: product.battery_mah
          ? `${product.battery_mah.toLocaleString()} mAh`
          : product.battery_wh
          ? `${product.battery_wh} Wh`
          : null,
      },
      {
        label: t('cat.spec_weight'),
        value: product.weight_kg
          ? `${product.weight_kg} kg`
          : product.weight_g
          ? `${product.weight_g} g`
          : null,
      },
    ],
  ]

  const score = product.performance_score
  const scorePercent = Math.min(100, Math.round((score / 1000) * 100))

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 flex flex-row h-72">

        {/* Image — left */}
        <div className="relative w-28 sm:w-36 flex-shrink-0 bg-surface-2 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              sizes="144px"
              unoptimized
            />
          ) : (
            <span className="text-3xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
          )}
          {/* Score badge */}
          {score > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-accent" />
              <span className="text-[10px] font-bold text-white tabular-nums">{Math.round(score)}</span>
            </div>
          )}
        </div>

        {/* Content — right */}
        <div className="flex flex-col justify-between flex-1 min-w-0 p-3 sm:p-4 gap-2">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">{product.brand}</p>
            <h3 className="text-base font-bold text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors">
              {product.name}
            </h3>
            {product.price_usd && (
              <p className="text-sm font-black text-accent mt-1">
                ${Number(product.price_usd).toLocaleString()}
              </p>
            )}
          </div>

          {/* Specs grid — 2 cols */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {specGrid.map((row, ri) =>
              row.map((s, ci) => (
                <div key={`${ri}-${ci}`}>
                  <p className="text-xs text-white/25 uppercase tracking-widest mb-0.5">{s.label}</p>
                  <p className={`text-sm font-semibold ${s.value ? 'text-white/75' : 'text-white/20'}`}>
                    {s.value ?? '–'}
                  </p>
                </div>
              ))
            )}
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

          {/* Add to Compare */}
          <button
            onClick={toggleCart}
            disabled={!inCart && cartFull}
            className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              inCart
                ? 'bg-accent/15 border border-accent/40 text-accent'
                : cartFull
                ? 'bg-surface-2 border border-border text-white/20 cursor-not-allowed'
                : 'bg-surface-2 border border-border text-white/50 hover:border-white/20 hover:text-white'
            }`}
          >
            {inCart ? (
              <><Check className="w-3 h-3" />{t('cat.in_compare')}</>
            ) : cartFull ? (
              <>{t('cat.compare_full')}</>
            ) : (
              <><Plus className="w-3 h-3" />{t('cat.add_compare')}</>
            )}
          </button>
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
  onChange,
}: {
  category: string
  categoryLabel: string
  availableBrands: string[]
  availableOsList: string[]
  filters: Filters
  onChange: (f: Filters) => void
}) {
  const { t } = useI18n()

  const SORT_OPTIONS = [
    { value: 'performance', label: t('cat.sort_performance') },
    { value: 'newest',      label: t('cat.sort_newest')      },
    { value: 'price_asc',   label: t('cat.sort_price_asc')   },
    { value: 'price_desc',  label: t('cat.sort_price_desc')  },
  ]

  const PRICE_OPTIONS = [
    { value: 'any',        label: t('cat.filter_price_any')       },
    { value: 'under500',   label: t('cat.filter_price_under500')  },
    { value: '500_1000',   label: t('cat.filter_price_500_1000')  },
    { value: '1000_1500',  label: t('cat.filter_price_1000_1500') },
    { value: 'over1500',   label: t('cat.filter_price_over1500')  },
  ]

  const DISPLAY_OPTIONS = [
    { value: 'any',   label: t('cat.filter_display_any')   },
    { value: 'small', label: t('cat.filter_display_small') },
    { value: 'mid',   label: t('cat.filter_display_mid')   },
    { value: 'large', label: t('cat.filter_display_large') },
  ]

  const BATTERY_OPTIONS = [
    { value: 0,    label: t('cat.filter_battery_any')  },
    { value: 4000, label: t('cat.filter_battery_4000') },
    { value: 5000, label: t('cat.filter_battery_5000') },
    { value: 6000, label: t('cat.filter_battery_6000') },
  ]

  const hasFilters =
    filters.brands.length > 0 ||
    filters.minRam > 0 ||
    filters.q ||
    filters.priceRange !== 'any' ||
    filters.os ||
    filters.displayRange !== 'any' ||
    filters.batteryMin > 0

  const toggleBrand = (brand: string) => {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand]
    onChange({ ...filters, brands: next })
  }

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 space-y-1.5">

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
      <FilterSection title={t('cat.filter_price')}>
        <div className="space-y-0.5">
          {PRICE_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              active={filters.priceRange === opt.value}
              onClick={() => onChange({ ...filters, priceRange: opt.value })}
            />
          ))}
        </div>
      </FilterSection>

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
      <FilterSection title={t('cat.filter_min_ram')}>
        <div className="grid grid-cols-3 gap-1.5">
          {RAM_OPTIONS.map((gb) => (
            <button
              key={gb}
              onClick={() => onChange({ ...filters, minRam: gb })}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filters.minRam === gb
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : 'bg-surface-2 border border-border text-white/40 hover:text-white hover:border-white/20'
              }`}
            >
              {gb === 0 ? t('cat.filter_all_ram') : `${gb}GB+`}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Display size */}
      <FilterSection title={t('cat.filter_display')} defaultOpen={false}>
        <div className="space-y-0.5">
          {DISPLAY_OPTIONS.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              active={filters.displayRange === opt.value}
              onClick={() => onChange({ ...filters, displayRange: opt.value })}
            />
          ))}
        </div>
      </FilterSection>

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
        <FilterSection title={t('cat.filter_battery')} defaultOpen={false}>
          <div className="space-y-0.5">
            {BATTERY_OPTIONS.map((opt) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                active={filters.batteryMin === opt.value}
                onClick={() => onChange({ ...filters, batteryMin: opt.value })}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Reset */}
      {hasFilters && (
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

// ─── Client-side filter logic ─────────────────────────────────────────────────

function applyClientFilters(products: Product[], filters: Filters): Product[] {
  return products.filter((p) => {
    // Brand
    if (filters.brands.length > 1 && !filters.brands.includes(p.brand)) return false

    // Price
    if (filters.priceRange !== 'any') {
      const price = p.price_usd ?? 0
      if (filters.priceRange === 'under500'  && price >= 500)   return false
      if (filters.priceRange === '500_1000'  && (price < 500  || price >= 1000)) return false
      if (filters.priceRange === '1000_1500' && (price < 1000 || price >= 1500)) return false
      if (filters.priceRange === 'over1500'  && price < 1500)  return false
    }

    // OS
    if (filters.os && p.os !== filters.os) return false

    // Display size
    if (filters.displayRange !== 'any') {
      const d = p.display_inch ?? 0
      if (filters.displayRange === 'small' && d >= 6)   return false
      if (filters.displayRange === 'mid'   && (d < 6 || d >= 6.7)) return false
      if (filters.displayRange === 'large' && d < 6.7)  return false
    }

    // Battery
    if (filters.batteryMin > 0 && (p.battery_mah ?? 0) < filters.batteryMin) return false

    return true
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryClient({ category }: { category: string }) {
  const { t } = useI18n()
  const Icon = CATEGORY_ICON[category]
  const categoryLabel = t(`cat.${category}` as Parameters<typeof t>[0])

  const [allProducts,     setAllProducts]     = useState<Product[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [availableOsList, setAvailableOsList] = useState<string[]>([])
  const [loading,         setLoading]         = useState(true)
  const [page,            setPage]            = useState(1)
  const [mobileFilters,   setMobileFilters]   = useState(false)

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  const PAGE_SIZE = 30

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all (large limit) for client-side filtering
      const params = new URLSearchParams({ category, sort: filters.sort, page: '1', limit: '999' })
      if (filters.brands.length === 1) params.set('brand', filters.brands[0])
      if (filters.minRam > 0)          params.set('minRam', String(filters.minRam))
      if (filters.q)                   params.set('q', filters.q)

      const res  = await fetch(`/api/products/list?${params}`)
      const json: ApiResponse = await res.json()

      setAllProducts(json.results ?? [])
      setAvailableBrands(json.brands ?? [])

      // Extract unique OS values
      const osValues = Array.from(new Set(
        (json.results ?? []).map((p) => p.os).filter(Boolean) as string[]
      )).sort()
      setAvailableOsList(osValues)
    } finally {
      setLoading(false)
    }
  }, [category, filters.sort, filters.brands, filters.minRam, filters.q])

  useEffect(() => {
    setPage(1)
    fetchProducts()
  }, [fetchProducts])

  const filtered = applyClientFilters(allProducts, filters)
  const total     = filtered.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const products   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilters =
    filters.brands.length > 0 ||
    filters.minRam > 0 ||
    filters.q ||
    filters.priceRange !== 'any' ||
    filters.os ||
    filters.displayRange !== 'any' ||
    filters.batteryMin > 0

  if (!Icon) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/30">{t('cat.empty')}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
            <Icon className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{categoryLabel}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/30 tabular-nums">
            {loading ? '–' : t('cat.count').replace('{n}', total.toLocaleString())}
          </span>
          <button
            onClick={() => setMobileFilters(!mobileFilters)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border text-xs text-white/60 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t('cat.filter_toggle')}
            {hasFilters && (
              <span className="bg-accent text-black text-[10px] font-black rounded-full px-1.5 py-0.5">!</span>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-5 items-start">
        {/* Sidebar */}
        <div className={`${mobileFilters ? 'block' : 'hidden'} lg:block sticky top-24`}>
          <FilterSidebar
            category={category}
            categoryLabel={categoryLabel}
            availableBrands={availableBrands}
            availableOsList={availableOsList}
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(1) }}
          />
        </div>

        {/* Product list */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse flex h-28">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }) }}
                    className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('cat.prev')}
                  </button>
                  <span className="text-sm text-white/30 tabular-nums">{page} / {totalPages}</span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }) }}
                    className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('cat.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
