'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
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

function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardWrapRefs = useRef<(HTMLDivElement | null)[]>([])
  const isPaused = useRef(false)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragScrollLeft = useRef(0)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      if (isPaused.current) return
      setActiveIdx(prev => {
        const next = (prev + 1) % items.length
        const el = scrollRef.current
        const wrap = cardWrapRefs.current[next]
        if (el && wrap) {
          const containerCenter = el.clientWidth / 2
          const cardCenter = wrap.offsetLeft + wrap.offsetWidth / 2
          const scrollTarget = cardCenter - containerCenter
          // 마지막→처음 wraparound는 instant 이동 (역방향 애니메이션 방지)
          if (next === 0 && prev === items.length - 1) {
            el.scrollLeft = scrollTarget
          } else {
            el.scrollTo({ left: scrollTarget, behavior: 'smooth' })
          }
        }
        return next
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [items.length])

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    isDragging.current = true
    isPaused.current = true
    dragStartX.current = e.pageX - el.offsetLeft
    dragScrollLeft.current = el.scrollLeft
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    const el = scrollRef.current
    if (!el) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    el.scrollLeft = dragScrollLeft.current - (x - dragStartX.current) * 1.5
  }
  const onMouseUp = () => {
    isDragging.current = false
    const el = scrollRef.current
    if (el) { el.style.cursor = ''; el.style.userSelect = '' }
    setTimeout(() => { isPaused.current = false }, 1000)
  }

  if (items.length === 0) return null
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
        <span className="text-xs text-white/30 ml-1">{t('compare.trending_sub')}</span>
      </div>
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={() => { isPaused.current = true }}
        onTouchEnd={() => { setTimeout(() => { isPaused.current = false }, 1500) }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 cursor-grab"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {/* center-mode left spacer */}
        <div className="flex-shrink-0 w-[calc(50vw-140px)] sm:w-[calc(50vw-150px)]" aria-hidden="true" />
        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => { cardWrapRefs.current[i] = el }}
            className="snap-center flex-shrink-0 w-[280px] sm:w-[300px]"
          >
            <Link
              href={item.href}
              draggable={false}
              onClick={(e) => { if (isDragging.current) e.preventDefault() }}
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
        {/* center-mode right spacer */}
        <div className="flex-shrink-0 w-[calc(50vw-140px)] sm:w-[calc(50vw-150px)]" aria-hidden="true" />
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
