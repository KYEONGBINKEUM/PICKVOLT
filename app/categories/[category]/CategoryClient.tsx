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

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  brand: string
  category: string
  price_usd: number | null
  image_url: string | null
  performance_score: number
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

const SORT_OPTIONS = [
  { value: 'performance', label: '성능순' },
  { value: 'newest',      label: '최신순' },
  { value: 'price_asc',   label: '가격 낮은순' },
  { value: 'price_desc',  label: '가격 높은순' },
]

const RAM_OPTIONS = [0, 4, 8, 12, 16, 32]

const CATEGORY_META: Record<string, { label: string; sublabel: string; icon: typeof Smartphone }> = {
  smartphone: { label: '스마트폰',  sublabel: 'Smartphones', icon: Smartphone },
  laptop:     { label: '노트북',    sublabel: 'Laptops',     icon: Laptop     },
  tablet:     { label: '태블릿',    sublabel: 'Tablets',     icon: Tablet     },
}

// ─── Product Card ────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const { cart, add, remove } = useCompareCart()
  const inCart  = cart.some((i) => i.id === product.id)
  const cartFull = cart.length >= 4

  const toggleCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inCart) remove(product.id)
    else if (!cartFull) add({ id: product.id, name: product.name, brand: product.brand, category: product.category })
  }

  // Key specs per category
  const specs: { label: string; value: string }[] = []

  if (product.display_inch) specs.push({ label: '화면', value: `${product.display_inch}"` })
  if (product.ram_gb)        specs.push({ label: 'RAM',  value: `${product.ram_gb}GB` })

  if (product.ppi)           specs.push({ label: 'PPI',     value: `${product.ppi}` })
  if (product.battery_mah)   specs.push({ label: '배터리',   value: `${product.battery_mah.toLocaleString()} mAh` })
  if (product.battery_wh)    specs.push({ label: '배터리',   value: `${product.battery_wh} Wh` })
  if (product.weight_kg)     specs.push({ label: '무게',     value: `${product.weight_kg} kg` })
  if (product.weight_g)      specs.push({ label: '무게',     value: `${product.weight_g} g` })

  const score = product.performance_score
  const scorePercent = Math.min(100, Math.round((score / 1000) * 100))

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-white/15 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 flex flex-col h-full">

        {/* Image */}
        <div className="relative aspect-square bg-surface-2 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-20">
              <span className="text-5xl font-black text-white">{product.brand?.[0] ?? '?'}</span>
            </div>
          )}

          {/* Score badge */}
          {score > 0 && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[11px] font-bold text-white tabular-nums">{Math.round(score)}</span>
              <span className="text-[9px] text-white/40 uppercase">pts</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 p-4 flex-1">
          {/* Brand */}
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{product.brand}</p>

          {/* Name */}
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {product.name}
          </h3>

          {/* Price */}
          {product.price_usd && (
            <p className="text-base font-black text-accent">
              ${Number(product.price_usd).toLocaleString()}
            </p>
          )}

          {/* Specs grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-auto">
            {specs.slice(0, 4).map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-[9px] text-white/25 uppercase tracking-widest mb-0.5">{s.label}</p>
                <p className="text-xs font-semibold text-white/80 truncate">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Performance bar */}
          {score > 0 && (
            <div className="mt-1">
              <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Add to Compare */}
          <button
            onClick={toggleCart}
            disabled={!inCart && cartFull}
            className={`mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              inCart
                ? 'bg-accent/15 border border-accent/40 text-accent'
                : cartFull
                ? 'bg-surface-2 border border-border text-white/20 cursor-not-allowed'
                : 'bg-surface-2 border border-border text-white/50 hover:border-white/20 hover:text-white'
            }`}
          >
            {inCart ? (
              <><Check className="w-3.5 h-3.5" />비교 중</>
            ) : cartFull ? (
              <>비교 최대 4개</>
            ) : (
              <><Plus className="w-3.5 h-3.5" />비교에 추가</>
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}

// ─── Filter Sidebar ──────────────────────────────────────────────────────────

interface Filters {
  brands: string[]
  minRam: number
  sort: string
  q: string
}

function FilterSidebar({
  availableBrands,
  filters,
  onChange,
}: {
  availableBrands: string[]
  filters: Filters
  onChange: (f: Filters) => void
}) {
  const [brandsOpen, setBrandsOpen] = useState(true)
  const [ramOpen,    setRamOpen]    = useState(true)

  const toggleBrand = (brand: string) => {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand]
    onChange({ ...filters, brands: next })
  }

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 space-y-1">
      {/* Sort */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">정렬</p>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, sort: opt.value })}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                filters.sort === opt.value
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-white/50 hover:text-white hover:bg-surface-2'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand */}
      {availableBrands.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-4">
          <button
            onClick={() => setBrandsOpen(!brandsOpen)}
            className="w-full flex items-center justify-between mb-3"
          >
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">브랜드</p>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${brandsOpen ? '' : '-rotate-90'}`} />
          </button>
          {brandsOpen && (
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
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
          )}
        </div>
      )}

      {/* RAM */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <button
          onClick={() => setRamOpen(!ramOpen)}
          className="w-full flex items-center justify-between mb-3"
        >
          <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">최소 RAM</p>
          <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${ramOpen ? '' : '-rotate-90'}`} />
        </button>
        {ramOpen && (
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
                {gb === 0 ? '전체' : `${gb}GB+`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reset */}
      {(filters.brands.length > 0 || filters.minRam > 0) && (
        <button
          onClick={() => onChange({ ...filters, brands: [], minRam: 0 })}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-white/40 hover:text-white transition-colors border border-border hover:border-white/20"
        >
          <X className="w-3.5 h-3.5" />
          필터 초기화
        </button>
      )}
    </aside>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CategoryClient({ category }: { category: string }) {
  const meta = CATEGORY_META[category]

  const [products,        setProducts]        = useState<Product[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [total,           setTotal]           = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [page,            setPage]            = useState(1)
  const [mobileFilters,   setMobileFilters]   = useState(false)

  const [filters, setFilters] = useState<Filters>({
    brands: [],
    minRam: 0,
    sort:   'performance',
    q:      '',
  })

  const fetchProducts = useCallback(async (f: Filters, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ category, sort: f.sort, page: String(p) })
      if (f.brands.length === 1) params.set('brand', f.brands[0])
      if (f.minRam > 0)          params.set('minRam', String(f.minRam))
      if (f.q)                   params.set('q', f.q)

      const res = await fetch(`/api/products/list?${params}`)
      const json: ApiResponse = await res.json()

      // Client-side multi-brand filter (API only supports single brand)
      const results = f.brands.length > 1
        ? json.results.filter((p) => f.brands.includes(p.brand))
        : json.results

      setProducts(results)
      setTotal(f.brands.length > 1 ? results.length : json.total)
      if (p === 1) setAvailableBrands(json.brands)
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    setPage(1)
    fetchProducts(filters, 1)
  }, [filters, fetchProducts])

  useEffect(() => {
    if (page > 1) fetchProducts(filters, page)
  }, [page, filters, fetchProducts])

  if (!meta) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-white/30">알 수 없는 카테고리입니다.</p>
      </div>
    )
  }

  const Icon = meta.icon

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
            <Icon className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{meta.label}</h1>
            <p className="text-xs text-white/30 uppercase tracking-widest">{meta.sublabel}</p>
          </div>
        </div>
        <span className="text-sm text-white/30 tabular-nums">
          {loading ? '–' : `${total.toLocaleString()}개`}
        </span>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
        <input
          type="text"
          placeholder={`${meta.label} 검색...`}
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className="w-full bg-surface border border-border rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-accent/50 transition-colors"
        />
        {filters.q && (
          <button onClick={() => setFilters({ ...filters, q: '' })} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-white/30 hover:text-white/60" />
          </button>
        )}
      </div>

      {/* Mobile filter toggle */}
      <button
        onClick={() => setMobileFilters(!mobileFilters)}
        className="lg:hidden flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl bg-surface border border-border text-sm text-white/60 hover:text-white transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4" />
        필터
        {(filters.brands.length > 0 || filters.minRam > 0) && (
          <span className="ml-1 bg-accent text-black text-[10px] font-black rounded-full px-1.5 py-0.5">
            {filters.brands.length + (filters.minRam > 0 ? 1 : 0)}
          </span>
        )}
      </button>

      {/* Body */}
      <div className="flex gap-6 items-start">
        {/* Sidebar — desktop always, mobile conditional */}
        <div className={`${mobileFilters ? 'block' : 'hidden'} lg:block`}>
          <FilterSidebar
            availableBrands={availableBrands}
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(1) }}
          />
        </div>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-surface-2" />
                  <div className="p-4 space-y-3">
                    <div className="h-2 bg-surface-2 rounded w-1/3" />
                    <div className="h-3 bg-surface-2 rounded w-4/5" />
                    <div className="h-3 bg-surface-2 rounded w-2/3" />
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="h-8 bg-surface-2 rounded" />
                      <div className="h-8 bg-surface-2 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Icon className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 text-sm">
                {filters.brands.length > 0 || filters.minRam > 0 || filters.q
                  ? '필터 조건에 맞는 제품이 없습니다.'
                  : '등록된 제품이 없습니다.'}
              </p>
              {(filters.brands.length > 0 || filters.minRam > 0 || filters.q) && (
                <button
                  onClick={() => setFilters({ brands: [], minRam: 0, sort: filters.sort, q: '' })}
                  className="mt-4 text-xs text-accent hover:underline"
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {total > 24 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    이전
                  </button>
                  <span className="text-sm text-white/30 tabular-nums">
                    {page} / {Math.ceil(total / 24)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(total / 24)}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 rounded-xl bg-surface border border-border text-sm text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    다음
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
