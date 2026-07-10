import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '국내 여행 장소 추천, 호텔 추천, 여행 소식',
  description: '국내외 여행 장소 추천, 호텔 추천, 최신 여행 소식을 전달합니다. 직접 경험한 솔직한 여행 정보만 씁니다.',
  alternates: { canonical: 'https://pickvolt.com' },
}

const CATEGORIES = [
  {
    title: '여행 장소 추천',
    desc: '국내 주요 여행지별 놓치면 안 될 명소와 숨겨진 스팟을 소개합니다.',
    href: '/travel',
    img: 'https://picsum.photos/seed/travel-place-scenery/900/600',
    tag: 'SPOT',
  },
  {
    title: '호텔 추천',
    desc: '가성비부터 럭셔리까지, 지역별 최적의 숙소를 직접 비교해 추천합니다.',
    href: '/travel?category=hotel',
    img: 'https://picsum.photos/seed/hotel-luxury-room/900/600',
    tag: 'HOTEL',
  },
  {
    title: '여행 소식',
    desc: '새로 열린 관광지, 시즌별 축제, 항공·숙박 할인 소식을 빠르게 전달합니다.',
    href: '/travel?category=news',
    img: 'https://picsum.photos/seed/travel-news-festival/900/600',
    tag: 'NEWS',
  },
]

const REGIONS = [
  { name: '서울', slug: 'seoul', desc: '도심 속 골목 여행', img: 'https://picsum.photos/seed/urban-seoul/800/600' },
  { name: '부산', slug: 'busan', desc: '바다와 야경의 도시', img: 'https://picsum.photos/seed/coastal-busan/800/600' },
  { name: '제주', slug: 'jeju', desc: '사계절 다른 섬 여행', img: 'https://picsum.photos/seed/jeju-island/800/600' },
  { name: '경주', slug: 'gyeongju', desc: '천년 역사 문화 여행', img: 'https://picsum.photos/seed/gyeongju-temple/800/600' },
  { name: '강릉', slug: 'gangneung', desc: '동해와 커피 향', img: 'https://picsum.photos/seed/gangneung-ocean/800/600' },
  { name: '전주', slug: 'jeonju', desc: '한옥과 맛의 수도', img: 'https://picsum.photos/seed/jeonju-hanok/800/600' },
]

const LATEST_POSTS = [
  {
    title: '제주 성산일출봉 주변 호텔 추천 TOP 5',
    category: '호텔 추천',
    region: '제주',
    regionSlug: 'jeju',
    slug: 'jeju-seongsan-hotel-top5',
    img: 'https://picsum.photos/seed/jeju-hotel-ocean/800/500',
    date: '2026-07-09',
    dateDisplay: '2026.07.09',
    excerpt: '성산일출봉 일출을 창문 너머로 볼 수 있는 숙소 5곳. 가성비부터 풀빌라까지 비교 정리.',
  },
  {
    title: '2026 부산 불꽃 축제 일정과 명당 자리 총정리',
    category: '여행 소식',
    region: '부산',
    regionSlug: 'busan',
    slug: 'busan-fireworks-2026',
    img: 'https://picsum.photos/seed/busan-fireworks-night/800/500',
    date: '2026-07-08',
    dateDisplay: '2026.07.08',
    excerpt: '2026 부산 불꽃 축제 날짜, 시간, 무료로 볼 수 있는 명당 위치 5곳을 정리했습니다.',
  },
  {
    title: '서울 근교 당일치기 드라이브 여행지 7곳',
    category: '여행 장소 추천',
    region: '서울',
    regionSlug: 'seoul',
    slug: 'seoul-daytrip-driving',
    img: 'https://picsum.photos/seed/seoul-daytrip-nature/800/500',
    date: '2026-07-07',
    dateDisplay: '2026.07.07',
    excerpt: '서울에서 1~2시간 이내, 차 끌고 떠나기 좋은 당일치기 여행지 7곳을 모았습니다.',
  },
]

export default function HomePage() {
  return (
    <div className="bg-white">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        aria-label="메인 소개"
        className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-8 items-center"
      >
        <div className="flex flex-col gap-7">
          <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#3B9FDE]">
            국내 여행 미디어
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#1A2535] leading-[1.05]">
            진짜<br />
            여행의<br />
            기준
          </h1>
          <p className="text-[16px] text-[#6A8AA8] leading-relaxed max-w-[36ch]">
            여행 장소 추천부터 호텔 비교, 최신 여행 소식까지.
            직접 경험한 정보만 골라 전달합니다.
          </p>
          <div className="flex items-center gap-5 pt-1">
            <Link
              href="/travel"
              className="inline-flex items-center bg-[#3B9FDE] text-white text-[16px] font-semibold px-7 py-3 rounded-sm hover:bg-[#2d8fce] transition-colors duration-200"
            >
              여행 정보 보기
            </Link>
            <Link href="/about" className="text-[16px] font-medium text-[#6A8AA8] hover:text-[#1A2535] transition-colors duration-200">
              소개 보기
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="relative h-[420px] lg:h-[480px] overflow-hidden rounded-sm">
            <Image
              src="https://picsum.photos/seed/korea-travel-main/900/700"
              alt="대한민국 여행"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2535]/40 to-transparent" />
          </div>
          <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-sm shadow-sm">
            <p className="text-[11px] tracking-[0.16em] uppercase text-[#3B9FDE] font-semibold mb-1">지금 인기</p>
            <p className="text-[16px] font-semibold text-[#1A2535]">제주 성산 호텔 TOP 5</p>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────── */}
      <section
        aria-label="콘텐츠 카테고리"
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100"
      >
        <h2 className="text-[30px] font-bold text-[#1A2535] tracking-tight mb-10">
          무엇을 찾고 계신가요?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group relative overflow-hidden rounded-sm block"
            >
              <div className="relative h-[240px]">
                <Image
                  src={cat.img}
                  alt={cat.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A2535]/80 via-[#1A2535]/30 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/80 bg-[#3B9FDE] px-2.5 py-1 rounded-sm">
                    {cat.tag}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 p-5">
                  <h3 className="text-white font-bold text-[20px] leading-tight mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-white/70 text-[16px] leading-snug">
                    {cat.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── REGIONS ──────────────────────────────────────── */}
      <section
        aria-label="지역별 여행 장소"
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100"
      >
        <div className="flex items-end justify-between mb-10">
          <h2 className="text-[30px] font-bold text-[#1A2535] tracking-tight">지역별 여행 장소</h2>
          <Link href="/travel" className="text-[16px] text-[#6A8AA8] hover:text-[#3B9FDE] transition-colors font-medium">
            전체 보기
          </Link>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 list-none">
          {REGIONS.map((region) => (
            <li key={region.slug}>
              <Link
                href={`/region/${region.slug}`}
                title={`${region.name} 여행 장소 추천`}
                className="group relative overflow-hidden rounded-sm aspect-[4/3] flex"
              >
                <div className="relative w-full h-full">
                  <Image
                    src={region.img}
                    alt={`${region.name} 여행 장소`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A2535]/70 via-[#1A2535]/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-5">
                    <h3 className="text-white font-bold text-[20px] leading-none mb-1.5">
                      {region.name}
                    </h3>
                    <p className="text-white/65 text-[16px] font-medium">{region.desc}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── LATEST POSTS ─────────────────────────────────── */}
      <section
        aria-label="최신 여행 정보"
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100"
      >
        <div className="flex items-end justify-between mb-10">
          <h2 className="text-[30px] font-bold text-[#1A2535] tracking-tight">최신 여행 정보</h2>
          <Link href="/travel" className="text-[16px] text-[#6A8AA8] hover:text-[#3B9FDE] transition-colors font-medium">
            전체 보기
          </Link>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none">
          {LATEST_POSTS.map((post) => (
            <li key={post.slug}>
              <article>
                <div className="group">
                  <Link href={`/travel/${post.slug}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-sm mb-4">
                      <Image
                        src={post.img}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white bg-[#3B9FDE] px-2 py-0.5 rounded-sm">
                      {post.category}
                    </span>
                    <Link href={`/region/${post.regionSlug}`} className="text-[14px] text-[#A8BED4] hover:text-[#3B9FDE] transition-colors">
                      {post.region}
                    </Link>
                  </div>
                  <Link href={`/travel/${post.slug}`} className="block">
                    <h3 className="text-[20px] font-semibold text-[#1A2535] leading-snug group-hover:text-[#3B9FDE] transition-colors mb-2">
                      {post.title}
                    </h3>
                    <p className="text-[16px] text-[#6A8AA8] leading-relaxed line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                  </Link>
                  <time dateTime={post.date} className="text-[14px] text-[#A8BED4]">
                    {post.dateDisplay}
                  </time>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* ── ABOUT STRIP ──────────────────────────────────── */}
      <section aria-label="사이트 소개" className="border-t border-gray-100 bg-[#F8FAFE]">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-2">
              광고·협찬 없는 솔직한 여행 정보
            </h2>
            <p className="text-[16px] text-[#6A8AA8] leading-relaxed max-w-[52ch]">
              PICKVOLT는 여행 장소 추천, 호텔 비교, 여행 소식을 직접 경험하고 조사한 정보로만 전달합니다.
            </p>
          </div>
          <Link href="/about" className="inline-flex items-center text-[16px] font-semibold text-[#3B9FDE] hover:underline underline-offset-4 shrink-0">
            PICKVOLT 소개 보기
          </Link>
        </div>
      </section>

    </div>
  )
}
