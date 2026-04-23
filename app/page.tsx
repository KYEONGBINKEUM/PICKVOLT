'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
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

/* ── 제품 썸네일 ── */
function ProductThumb({ product }: { product: Product }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="w-20 h-20 rounded-xl bg-surface-2 flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-2xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
        )}
      </div>
      <p className="text-xs text-white/55 text-center line-clamp-2 leading-tight w-full px-1">
        {product.name}
      </p>
    </div>
  )
}

/* ── 트렌딩 캐러셀 (Embla · infinite · center) ── */
function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  const [isDragging, setIsDragging] = useState(false)

  const autoplay = Autoplay({ delay: 2800, stopOnInteraction: false, stopOnMouseEnter: true })

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', containScroll: false, dragFree: false },
    [autoplay],
  )

  const onPointerDown = useCallback(() => setIsDragging(false), [])
  const onPointerUp   = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('pointerDown', () => setIsDragging(true))
    emblaApi.on('pointerUp',   () => setTimeout(() => setIsDragging(false), 100))
  }, [emblaApi])

  if (items.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
      </div>

      {/* Embla viewport — peek padding shows adjacent cloned slides */}
      <div
        ref={emblaRef}
        className="overflow-hidden w-full cursor-grab active:cursor-grabbing"
        style={{ paddingLeft: '10%', paddingRight: '10%' }}
      >
        <div className="flex">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] sm:w-[300px] px-2"
            >
              <Link
                href={item.href}
                draggable={false}
                onClick={(e) => { if (isDragging) e.preventDefault() }}
                className="block bg-surface border border-border rounded-2xl px-4 py-4 hover:border-white/20 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-2">
                  <ProductThumb product={item.productA} />
                  <span className="flex-shrink-0 text-xs font-black text-white/20 px-1">vs</span>
                  <ProductThumb product={item.productB} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 메인 컨텐츠 ── */
function HomeContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [trending, setTrending] = useState<TrendingCard[]>([])

  useEffect(() => {
    fetch('/api/compare/popular')
      .then(r => r.json())
      .then(d => { if (d.items?.length > 0) setTrending(d.items) })
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* 히어로 영역: 항상 수직 중앙 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12">
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>
          <SearchBar initialQuery={initialQuery} />
        </div>
      </div>

      {/* 트렌딩 캐러셀: 페이지 하단 */}
      {trending.length > 0 && (
        <div className="w-full pb-12">
          <TrendingCarousel items={trending} t={t} />
        </div>
      )}
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
