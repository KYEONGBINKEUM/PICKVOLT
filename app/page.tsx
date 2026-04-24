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

/* ── 트렌딩 마키 (width 100% · 양쪽 마스크 · 무한 흐름) ── */
function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  const CARD_W = 260
  const GAP    = 16
  const SLOT   = CARD_W + GAP

  // 두 벌 복제 → CSS animation으로 seamless 무한 루프
  const doubled = [...items, ...items]

  // 아이템 수에 따라 속도 자동 조정 (카드 1개당 4초)
  const duration = items.length * 4

  if (items.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
      </div>

      {/* 양쪽 마스크로 자연스럽게 페이드 */}
      <div
        className="overflow-hidden w-full group/marquee"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-${items.length * SLOT}px); }
          }
        `}</style>

        <div
          className="flex group-hover/marquee:[animation-play-state:paused]"
          style={{
            animation: `marquee ${duration}s linear infinite`,
            width: `${doubled.length * SLOT}px`,
          }}
        >
          {doubled.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0"
              style={{ width: CARD_W, marginRight: GAP }}
            >
              <Link
                href={item.href}
                className="block bg-surface border border-border rounded-2xl px-4 py-4 hover:border-white/20 transition-colors"
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

      {/* 히어로 + 캐러셀: 수직 중앙 정렬 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12 gap-10">
        {/* 검색 영역 */}
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>
          <SearchBar initialQuery={initialQuery} />
        </div>

        {/* 트렌딩 캐러셀: 검색 바로 아래 */}
        {trending.length > 0 && (
          <div className="w-full max-w-4xl">
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
