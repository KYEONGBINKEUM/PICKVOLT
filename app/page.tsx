'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { TrendingUp, Flame, MessageSquare } from 'lucide-react'
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

interface HotPost {
  id: string
  title: string
  body: string
  type: string
  upvotes: number
  comment_count: number
  created_at: string
  user_display_name: string
  community_post_products: { products: { id: string; name: string; image_url: string | null } | null }[]
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

/* ── 트렌딩 캐러셀 ── */
function TrendingCarousel({ items, t }: { items: TrendingCard[]; t: (k: string) => string }) {
  const scrollRef      = useRef<HTMLDivElement>(null)
  const cardWrapRefs   = useRef<(HTMLDivElement | null)[]>([])
  const isPaused       = useRef(false)
  const isDragging     = useRef(false)
  const dragStartX     = useRef(0)
  const dragScrollLeft = useRef(0)
  const [activeIdx, setActiveIdx] = useState(0)

  // 마운트 후 첫 번째 카드 중앙 정렬
  useEffect(() => {
    if (items.length === 0) return
    const el = scrollRef.current
    const wrap = cardWrapRefs.current[0]
    if (el && wrap) {
      el.scrollLeft = wrap.offsetLeft - (el.clientWidth - wrap.offsetWidth) / 2
    }
  }, [items])

  // 자동 슬라이드
  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      if (isPaused.current) return
      setActiveIdx(prev => {
        const next = (prev + 1) % items.length
        const el   = scrollRef.current
        const wrap = cardWrapRefs.current[next]
        if (el && wrap) {
          const scrollTarget = wrap.offsetLeft - (el.clientWidth - wrap.offsetWidth) / 2
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
    isDragging.current    = true
    isPaused.current      = true
    dragStartX.current    = e.pageX - el.offsetLeft
    dragScrollLeft.current = el.scrollLeft
    el.style.cursor       = 'grabbing'
    el.style.userSelect   = 'none'
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
      </div>

      {/* full-width scroll — spacer를 50%로 계산해서 첫/마지막 카드 중앙 배치 */}
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
        {/* 좌측 spacer: 컨테이너 너비의 절반 - 카드 너비의 절반 */}
        <div className="flex-shrink-0 w-[calc(50%-140px)] sm:w-[calc(50%-150px)]" aria-hidden="true" />
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
        {/* 우측 spacer */}
        <div className="flex-shrink-0 w-[calc(50%-140px)] sm:w-[calc(50%-150px)]" aria-hidden="true" />
      </div>
    </div>
  )
}

/* ── 커뮤니티 인기글 카드 ── */
function HotPostCard({ post }: { post: HotPost }) {
  const isHtml    = /<[a-z]/i.test(post.body ?? '')
  const bodyThumb = isHtml ? (post.body.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null) : null
  const prodThumb = post.community_post_products?.[0]?.products?.image_url ?? null
  const thumb     = bodyThumb ?? prodThumb
  const plainText = isHtml
    ? post.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : (post.body ?? '')

  return (
    <Link
      href={`/community/posts/${post.id}`}
      className="flex gap-3 bg-surface border border-border rounded-xl p-3.5 hover:border-white/20 active:scale-[0.99] transition-all"
    >
      {/* 썸네일 */}
      <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-surface-2 overflow-hidden flex items-center justify-center">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <MessageSquare className="w-4 h-4 text-white/15" />
        )}
      </div>
      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white line-clamp-1 mb-1 leading-snug">{post.title}</p>
        {plainText && (
          <p className="text-xs text-white/35 line-clamp-2 leading-relaxed">{plainText}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/20">
          <span>{post.user_display_name}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <MessageSquare className="w-2.5 h-2.5" />{post.comment_count}
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── 커뮤니티 인기글 섹션 ── */
function CommunityHotSection({ posts, t }: { posts: HotPost[]; t: (k: string) => string }) {
  if (posts.length === 0) return null
  return (
    <div className="w-full max-w-3xl px-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-accent" />
          <h3 className="text-lg font-black text-white">{t('community.popular')}</h3>
        </div>
        <Link href="/community?sort=hot"
          className="text-xs text-white/30 hover:text-white/60 transition-colors">
          {t('community.all')} →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {posts.map(post => <HotPostCard key={post.id} post={post} />)}
      </div>
    </div>
  )
}

/* ── 메인 컨텐츠 ── */
function HomeContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [trending,  setTrending]  = useState<TrendingCard[]>([])
  const [hotPosts,  setHotPosts]  = useState<HotPost[]>([])

  useEffect(() => {
    // 트렌딩 비교 + 커뮤니티 인기글 병렬 로드
    Promise.all([
      fetch('/api/compare/popular').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/community/posts?sort=hot&limit=4').then(r => r.json()).catch(() => ({ posts: [] })),
    ]).then(([trending, community]) => {
      if (trending.items?.length > 0)   setTrending(trending.items)
      if (community.posts?.length > 0)  setHotPosts(community.posts.slice(0, 4))
    })
  }, [])

  const hasBelowContent = trending.length > 0 || hotPosts.length > 0

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* 히어로 영역 */}
      <div className={`flex flex-col items-center px-6 ${hasBelowContent ? 'pt-28 pb-10 md:pt-32 md:pb-12' : 'flex-1 justify-center pb-24 pt-16 md:pt-0'}`}>
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>
          <SearchBar initialQuery={initialQuery} />
        </div>
      </div>

      {/* 트렌딩 캐러셀 (full-width) */}
      {trending.length > 0 && (
        <div className="w-full mb-12">
          <TrendingCarousel items={trending} t={t} />
        </div>
      )}

      {/* 커뮤니티 인기글 */}
      {hotPosts.length > 0 && (
        <div className="flex justify-center mb-24">
          <CommunityHotSection posts={hotPosts} t={t} />
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
