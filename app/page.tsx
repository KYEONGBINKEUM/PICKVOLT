'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import { useI18n } from '@/lib/i18n'

interface Product {
  id: string
  name: string
  brand: string
  image_url: string | null
}

interface TrendingCard {
  productA: Product
  productB: Product
  href: string
  cnt: number
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="w-16 h-16 rounded-xl bg-surface-2 flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-1.5" />
        ) : (
          <span className="text-xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
        )}
      </div>
      <p className="text-[11px] text-white/55 text-center line-clamp-2 leading-tight w-full px-1">
        {product.name}
      </p>
    </div>
  )
}

function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  if (items.length === 0) return null
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
        <span className="text-xs text-white/30 ml-1">{t('compare.trending_sub')}</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="snap-start flex-shrink-0 w-[240px] sm:w-[260px] bg-surface border border-border rounded-2xl px-4 py-4 hover:border-white/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <ProductThumb product={item.productA} />
              <span className="flex-shrink-0 text-xs font-black text-white/20 px-1">vs</span>
              <ProductThumb product={item.productB} />
            </div>
            {item.cnt > 1 && (
              <p className="text-[10px] text-white/20 text-center mt-3 tabular-nums">{item.cnt}×</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function HomeContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [trending, setTrending] = useState<TrendingCard[]>([])

  useEffect(() => {
    fetch('/api/compare/popular')
      .then((r) => r.json())
      .then((d: { items: TrendingCard[] }) => {
        if (d.items && d.items.length > 0) setTrending(d.items)
      })
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 pt-16 md:pt-0">
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>

          <SearchBar initialQuery={initialQuery} />

          <TrendingCarousel items={trending} t={t} />
        </div>
      </div>
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
