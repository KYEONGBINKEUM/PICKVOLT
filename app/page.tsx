'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { Metadata } from 'next'

/* ── Intersection Observer reveal ────────────────────────────── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect() } },
      { threshold: 0.10 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

/* ── Data ────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    tag: 'SPOT',
    tagBg: 'var(--pastel-blue-bg)',
    tagColor: 'var(--pastel-blue-text)',
    title: '여행 장소 추천',
    desc: '국내 주요 여행지, 숨겨진 스팟, 시즌별 명소를 직접 조사해 엄선합니다.',
    href: '/travel',
    img: 'https://picsum.photos/seed/travel-spot-korea/900/600',
  },
  {
    tag: 'HOTEL',
    tagBg: 'var(--pastel-green-bg)',
    tagColor: 'var(--pastel-green-text)',
    title: '호텔 추천',
    desc: '가성비부터 럭셔리까지, 지역별 숙소를 비교합니다.',
    href: '/travel?category=hotel',
    img: 'https://picsum.photos/seed/hotel-korea-room/900/600',
  },
  {
    tag: 'NEWS',
    tagBg: 'var(--pastel-yellow-bg)',
    tagColor: 'var(--pastel-yellow-text)',
    title: '여행 소식',
    desc: '새 관광지, 시즌 축제, 항공·숙박 할인 정보를 빠르게 전달합니다.',
    href: '/travel?category=news',
    img: 'https://picsum.photos/seed/travel-news-korea/900/600',
  },
]

const REGIONS = [
  { name: '서울',  slug: 'seoul',     meta: 'Urban · Street',   img: 'https://picsum.photos/seed/seoul-street-scene/800/600' },
  { name: '부산',  slug: 'busan',     meta: 'Coast · Night',    img: 'https://picsum.photos/seed/busan-coast-view/800/600' },
  { name: '제주',  slug: 'jeju',      meta: 'Island · Nature',  img: 'https://picsum.photos/seed/jeju-nature-view/800/600' },
  { name: '경주',  slug: 'gyeongju', meta: 'Heritage · Temple', img: 'https://picsum.photos/seed/gyeongju-temple-view/800/600' },
  { name: '강릉',  slug: 'gangneung', meta: 'Sea · Coffee',     img: 'https://picsum.photos/seed/gangneung-sea-view/800/600' },
  { name: '전주',  slug: 'jeonju',   meta: 'Hanok · Food',     img: 'https://picsum.photos/seed/jeonju-hanok-view/800/600' },
]

/* 최신 글 — The New Yorker 스타일 피드 (대표 1 + 보조 2) */
const FEATURED_POST = {
  tag: '호텔 추천', tagBg: 'var(--pastel-green-bg)', tagColor: 'var(--pastel-green-text)',
  title: '제주 성산일출봉 주변 호텔 추천 TOP 5',
  region: '제주', regionSlug: 'jeju',
  slug: 'jeju-seongsan-hotel-top5',
  img: 'https://picsum.photos/seed/jeju-hotel-sea-view/1200/800',
  date: '2026-07-09', dateDisplay: '2026.07.09',
  excerpt: '성산일출봉 일출을 객실 창문 너머로 볼 수 있는 숙소 5곳. 풀빌라부터 가성비 펜션까지 직접 비교했습니다.',
}

const SIDE_POSTS = [
  {
    tag: '여행 소식', tagBg: 'var(--pastel-yellow-bg)', tagColor: 'var(--pastel-yellow-text)',
    title: '2026 부산 불꽃 축제 일정과 명당 자리 총정리',
    region: '부산', regionSlug: 'busan',
    slug: 'busan-fireworks-2026',
    img: 'https://picsum.photos/seed/busan-fireworks-night/800/500',
    date: '2026-07-08', dateDisplay: '2026.07.08',
    excerpt: '날짜, 시간, 무료로 볼 수 있는 명당 위치 5곳을 정리했습니다.',
  },
  {
    tag: '장소 추천', tagBg: 'var(--pastel-blue-bg)', tagColor: 'var(--pastel-blue-text)',
    title: '서울 근교 당일치기 드라이브 여행지 7곳',
    region: '서울', regionSlug: 'seoul',
    slug: 'seoul-daytrip-driving',
    img: 'https://picsum.photos/seed/seoul-daytrip-nature/800/500',
    date: '2026-07-07', dateDisplay: '2026.07.07',
    excerpt: '서울에서 1~2시간 이내, 차 끌고 떠나기 좋은 당일치기 여행지 7곳.',
  },
]

/* ── Reusable Tag badge ───────────────────────────────────────── */
function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="inline-block text-[10px] font-semibold tracking-[0.14em] uppercase"
      style={{ background: bg, color, padding: '3px 9px', borderRadius: '9999px' }}
    >
      {label}
    </span>
  )
}

/* ── Page ────────────────────────────────────────────────────── */
export default function HomePage() {
  /* Each section gets its own reveal ref */
  const heroRef    = useReveal<HTMLElement>()
  const catRef     = useReveal<HTMLElement>()
  const regionRef  = useReveal<HTMLElement>()
  const latestRef  = useReveal<HTMLElement>()
  const aboutRef   = useReveal<HTMLElement>()

  return (
    <div className="relative overflow-x-hidden">
      {/* Ambient blob — fixed layer, pointer-events none */}
      <div className="ambient-blob" aria-hidden="true" />

      {/* ══ HERO — Lonely Planet 에디토리얼 커버 스타일 ══════════ */}
      <section ref={heroRef} className="reveal max-w-5xl mx-auto px-6 pt-24 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-end">

          {/* Left copy */}
          <div className="flex flex-col gap-8">
            <Tag label="국내 여행 미디어" bg="var(--pastel-blue-bg)" color="var(--pastel-blue-text)" />

            {/* 에디토리얼 serif 대형 헤드라인 */}
            <h1
              className="font-editorial"
              style={{ fontSize: 'clamp(52px,8vw,88px)', color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.04 }}
            >
              진짜<br />
              여행의<br />
              기준
            </h1>

            <p style={{ fontSize: '17px', lineHeight: '1.7', color: 'var(--ink-2)', maxWidth: '38ch' }}>
              여행 장소 추천, 호텔 비교, 최신 여행 소식.<br />
              직접 경험하고 조사한 정보만 씁니다.
            </p>

            <div className="flex items-center gap-6 pt-2">
              <Link href="/travel" className="btn-primary">여행 정보 보기</Link>
              <Link href="/about" className="btn-ghost">소개 보기</Link>
            </div>
          </div>

          {/* Right — hero image card */}
          <div className="relative bento-border overflow-hidden" style={{ height: 'clamp(320px,45vw,500px)' }}>
            <Image
              src="https://picsum.photos/seed/korea-travel-hero-main/900/700"
              alt="대한민국 여행"
              fill
              className="object-cover"
              priority
              sizes="(max-width:1024px) 100vw, 420px"
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.55) 0%, transparent 55%)' }} />
            {/* Floating card — 한국형 신뢰 배지 */}
            <div
              className="absolute bottom-5 left-5 right-5"
              style={{
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '12px 16px',
                border: '1px solid var(--border)',
              }}
            >
              <p className="font-mono-ui tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--pastel-blue-text)', fontSize: '10px' }}>
                지금 인기
              </p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>제주 성산 호텔 TOP 5</p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr style={{ borderColor: 'var(--border)' }} />
      </div>

      {/* ══ CATEGORIES — 비대칭 벤토 그리드 ══════════════════════ */}
      <section ref={catRef} className="reveal max-w-5xl mx-auto px-6 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: '30px', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            무엇을 찾고 계신가요?
          </h2>
          <Link href="/travel" className="btn-ghost" style={{ fontSize: '14px' }}>전체 보기</Link>
        </div>

        {/* lg: wide left + 2 stacked right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Wide card */}
          <Link href={CATEGORIES[0].href} className="group card-lift bento-border overflow-hidden block md:row-span-2">
            <div className="relative" style={{ height: 'clamp(200px,30vw,340px)' }}>
              <Image
                src={CATEGORIES[0].img}
                alt={CATEGORIES[0].title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width:768px) 100vw, 50vw"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.70) 0%, transparent 50%)' }} />
            </div>
            <div className="p-7">
              <Tag label={CATEGORIES[0].tag} bg={CATEGORIES[0].tagBg} color={CATEGORIES[0].tagColor} />
              <h3 className="font-bold mt-3 mb-2" style={{ fontSize: '20px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {CATEGORIES[0].title}
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.65', color: 'var(--ink-2)' }}>{CATEGORIES[0].desc}</p>
            </div>
          </Link>

          {/* Two stacked cards */}
          {CATEGORIES.slice(1).map((cat) => (
            <Link key={cat.href} href={cat.href} className="group card-lift bento-border overflow-hidden block">
              <div className="relative" style={{ height: '150px' }}>
                <Image
                  src={cat.img}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width:768px) 100vw, 50vw"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.65) 0%, transparent 55%)' }} />
              </div>
              <div className="p-6">
                <Tag label={cat.tag} bg={cat.tagBg} color={cat.tagColor} />
                <h3 className="font-bold mt-3 mb-1" style={{ fontSize: '20px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                  {cat.title}
                </h3>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--ink-2)' }}>{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr style={{ borderColor: 'var(--border)' }} />
      </div>

      {/* ══ REGIONS — 6-grid 지역 카드 ════════════════════════════ */}
      <section ref={regionRef} className="reveal-stagger max-w-5xl mx-auto px-6 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: '30px', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            지역별 여행 장소
          </h2>
          <Link href="/travel" className="btn-ghost" style={{ fontSize: '14px' }}>전체 보기</Link>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 list-none p-0 m-0">
          {REGIONS.map((region) => (
            <li key={region.slug}>
              <Link
                href={`/region/${region.slug}`}
                title={`${region.name} 여행 장소 추천`}
                className="group card-lift bento-border overflow-hidden block aspect-[4/3]"
              >
                <div className="relative w-full h-full">
                  <Image
                    src={region.img}
                    alt={`${region.name} 여행`}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width:768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.68) 0%, transparent 52%)' }} />
                  <div className="absolute bottom-0 left-0 p-5">
                    <h3 className="font-bold leading-none mb-1.5" style={{ fontSize: '20px', color: '#fff' }}>
                      {region.name}
                    </h3>
                    <p className="font-mono-ui tracking-[0.08em] uppercase" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '10px' }}>
                      {region.meta}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr style={{ borderColor: 'var(--border)' }} />
      </div>

      {/* ══ LATEST — The New Yorker 스타일: 대표 1 + 보조 2 사이드 ══ */}
      <section ref={latestRef} className="reveal max-w-5xl mx-auto px-6 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: '30px', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            최신 여행 정보
          </h2>
          <Link href="/travel" className="btn-ghost" style={{ fontSize: '14px' }}>전체 보기</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
          {/* Featured — cover image + full excerpt */}
          <article className="group">
            <Link href={`/travel/${FEATURED_POST.slug}`} className="block">
              <div
                className="relative overflow-hidden mb-6"
                style={{ aspectRatio: '16/9', borderRadius: '10px', border: '1px solid var(--border)' }}
              >
                <Image
                  src={FEATURED_POST.img}
                  alt={FEATURED_POST.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width:1024px) 100vw, 60vw"
                />
              </div>
            </Link>
            <div className="flex items-center gap-2 mb-3">
              <Tag label={FEATURED_POST.tag} bg={FEATURED_POST.tagBg} color={FEATURED_POST.tagColor} />
              <Link href={`/region/${FEATURED_POST.regionSlug}`} className="font-mono-ui" style={{ color: 'var(--ink-3)', fontSize: '11px' }}>
                {FEATURED_POST.region}
              </Link>
            </div>
            <Link href={`/travel/${FEATURED_POST.slug}`} className="block">
              <h3
                className="font-semibold leading-snug mb-3 transition-colors duration-200 group-hover:text-[#3B9FDE]"
                style={{ fontSize: '22px', color: 'var(--ink)', letterSpacing: '-0.015em' }}
              >
                {FEATURED_POST.title}
              </h3>
              <p style={{ fontSize: '16px', lineHeight: '1.7', color: 'var(--ink-2)' }}>
                {FEATURED_POST.excerpt}
              </p>
            </Link>
            <time dateTime={FEATURED_POST.date} className="font-mono-ui mt-4 block" style={{ color: 'var(--ink-3)', fontSize: '11px' }}>
              {FEATURED_POST.dateDisplay}
            </time>
          </article>

          {/* Side list — New Yorker 보조 스트림 */}
          <aside className="flex flex-col gap-0">
            {SIDE_POSTS.map((post, i) => (
              <article key={post.slug} className="group">
                {i > 0 && <hr style={{ borderColor: 'var(--border)', margin: '20px 0' }} />}
                <Link href={`/travel/${post.slug}`} className="block">
                  <div
                    className="relative overflow-hidden mb-4"
                    style={{ aspectRatio: '16/9', borderRadius: '8px', border: '1px solid var(--border)' }}
                  >
                    <Image
                      src={post.img}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes="320px"
                    />
                  </div>
                </Link>
                <div className="flex items-center gap-2 mb-2">
                  <Tag label={post.tag} bg={post.tagBg} color={post.tagColor} />
                  <Link href={`/region/${post.regionSlug}`} className="font-mono-ui" style={{ color: 'var(--ink-3)', fontSize: '11px' }}>
                    {post.region}
                  </Link>
                </div>
                <Link href={`/travel/${post.slug}`} className="block">
                  <h3
                    className="font-semibold leading-snug mb-2 transition-colors duration-200 group-hover:text-[#3B9FDE]"
                    style={{ fontSize: '17px', color: 'var(--ink)', letterSpacing: '-0.01em' }}
                  >
                    {post.title}
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.65', color: 'var(--ink-2)' }}>{post.excerpt}</p>
                </Link>
                <time dateTime={post.date} className="font-mono-ui mt-3 block" style={{ color: 'var(--ink-3)', fontSize: '11px' }}>
                  {post.dateDisplay}
                </time>
              </article>
            ))}
          </aside>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6">
        <hr style={{ borderColor: 'var(--border)' }} />
      </div>

      {/* ══ ABOUT STRIP ═══════════════════════════════════════════ */}
      <section ref={aboutRef} className="reveal max-w-5xl mx-auto px-6 py-24">
        <div
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center bento-border p-10"
          style={{ background: 'var(--surface)' }}
        >
          <div>
            <p className="font-mono-ui tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--pastel-blue-text)', fontSize: '10px' }}>
              About
            </p>
            <h2 className="font-bold mb-2" style={{ fontSize: '20px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              광고·협찬과 무관한 솔직한 여행 정보
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--ink-2)', maxWidth: '52ch' }}>
              PICKVOLT는 여행 장소 추천, 호텔 비교, 여행 소식을 직접 경험하고 조사한 정보로만 전달합니다.
            </p>
          </div>
          <Link href="/about" className="btn-primary shrink-0">
            PICKVOLT 소개
          </Link>
        </div>
      </section>

    </div>
  )
}
