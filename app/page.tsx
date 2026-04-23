'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
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

/* ── 트렌딩 캐러셀 (clone-based infinite · center mode) ── */
function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  const router = useRouter()
  const CARD_W = 300   // card width px (+ px-2 padding = 316 total slot)
  const GAP    = 16    // px-2 on each side
  const SLOT   = CARD_W + GAP

  // Triple clone: [copy1, original, copy2] → start from original(middle) set
  const slides = [...items, ...items, ...items]
  const totalSets = 3
  const setLen = items.length

  const trackRef   = useRef<HTMLDivElement>(null)
  const offsetRef  = useRef(setLen * SLOT)   // start at middle set
  const dragging   = useRef(false)
  const didDrag    = useRef(false)
  const dragStart  = useRef(0)
  const dragOffset = useRef(0)
  const animFrame  = useRef<number | null>(null)
  const [renderOffset, setRenderOffset] = useState(setLen * SLOT)

  // Apply offset to DOM directly for snappy performance
  const applyOffset = useCallback((px: number, animate: boolean) => {
    if (!trackRef.current) return
    trackRef.current.style.transition = animate ? 'transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none'
    trackRef.current.style.transform = `translateX(${-px}px)`
    offsetRef.current = px
  }, [])

  // After animated transition, silently reposition to middle set
  const normalize = useCallback(() => {
    const min = SLOT
    const max = (totalSets - 1) * setLen * SLOT - SLOT
    let o = offsetRef.current
    if (o < min) {
      o += setLen * SLOT
    } else if (o > max) {
      o -= setLen * SLOT
    }
    if (o !== offsetRef.current) {
      applyOffset(o, false)
      setRenderOffset(o)
    }
  }, [applyOffset, setLen])

  // Auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      if (dragging.current) return
      const next = offsetRef.current + SLOT
      applyOffset(next, true)
      setRenderOffset(next)
      // Normalize after transition
      setTimeout(normalize, 420)
    }, 2800)
    return () => clearInterval(id)
  }, [applyOffset, normalize])

  // Touch / pointer drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    didDrag.current = false
    dragStart.current = e.clientX
    dragOffset.current = offsetRef.current
    if (animFrame.current) cancelAnimationFrame(animFrame.current)
    if (trackRef.current) trackRef.current.style.transition = 'none'
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const delta = dragStart.current - e.clientX
    if (Math.abs(delta) > 4) didDrag.current = true
    applyOffset(dragOffset.current + delta, false)
  }, [applyOffset])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const delta = dragStart.current - e.clientX
    // Snap to nearest card
    const raw = dragOffset.current + delta
    const snapped = Math.round(raw / SLOT) * SLOT
    applyOffset(snapped, true)
    setRenderOffset(snapped)
    setTimeout(normalize, 420)
  }, [applyOffset, normalize])

  // Init position
  useEffect(() => {
    applyOffset(setLen * SLOT, false)
  }, [applyOffset, setLen])

  if (items.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
      </div>

      {/* Viewport: overflow-hidden + side gradient mask */}
      <div
        className="overflow-hidden w-full cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        {/* Track: starts shifted so center card is centered */}
        <div
          ref={trackRef}
          className="flex will-change-transform"
          style={{
            // Offset by half-viewport minus half-card so first visible card is centered
            paddingLeft: `calc(50% - ${CARD_W / 2}px)`,
            transform: `translateX(-${setLen * SLOT}px)`,
          }}
        >
          {slides.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 px-2"
              style={{ width: CARD_W }}
            >
              <div
                onPointerUp={() => { if (!didDrag.current) router.push(item.href) }}
                className="block bg-surface border border-border rounded-2xl px-4 py-4 hover:border-white/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ProductThumb product={item.productA} />
                  <span className="flex-shrink-0 text-xs font-black text-white/20 px-1">vs</span>
                  <ProductThumb product={item.productB} />
                </div>
              </div>
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

      {/* 히어로 + 캐러셀: 수직 중앙 정렬 */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-12 gap-16">
        {/* 검색 영역 */}
        <div className="w-full max-w-3xl px-6 flex flex-col items-center gap-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>
          <SearchBar initialQuery={initialQuery} />
        </div>

        {/* 트렌딩 캐러셀: 풀 너비 */}
        {trending.length > 0 && (
          <div className="w-full">
            <TrendingCarousel items={trending} t={t} />
          </div>
        )}
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
