import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '국내여행 가이드 — 진짜 여행의 기준',
  description: '서울, 부산, 제주, 경주, 강릉, 전주 국내 여행지별 맛집·숙소·코스 추천. 직접 가보고 경험한 솔직한 여행 정보만 씁니다.',
  alternates: { canonical: 'https://pickvolt.com' },
}

const REGIONS = [
  {
    name: '서울',
    slug: 'seoul',
    desc: '골목부터 한강까지, 서울 여행 가이드',
    keyword: '서울여행',
    img: 'https://picsum.photos/seed/urban-seoul-night/800/600',
  },
  {
    name: '부산',
    slug: 'busan',
    desc: '바다와 골목, 부산 여행 완벽 가이드',
    keyword: '부산여행',
    img: 'https://picsum.photos/seed/coastal-harbor-city/800/600',
  },
  {
    name: '제주',
    slug: 'jeju',
    desc: '오름과 바다, 제주도 여행 코스 추천',
    keyword: '제주도여행',
    img: 'https://picsum.photos/seed/volcanic-green-island/800/600',
  },
  {
    name: '경주',
    slug: 'gyeongju',
    desc: '천년 역사의 도시, 경주 여행 가이드',
    keyword: '경주여행',
    img: 'https://picsum.photos/seed/ancient-stone-temple/800/600',
  },
  {
    name: '강릉',
    slug: 'gangneung',
    desc: '동해 바다와 커피 향, 강릉 여행 추천',
    keyword: '강릉여행',
    img: 'https://picsum.photos/seed/pine-ocean-sunrise/800/600',
  },
  {
    name: '전주',
    slug: 'jeonju',
    desc: '한옥마을과 맛의 수도, 전주 여행 코스',
    keyword: '전주여행',
    img: 'https://picsum.photos/seed/traditional-hanok-village/800/600',
  },
]

const PLACEHOLDER_POSTS = [
  {
    title: '제주 동쪽 해안 드라이브 완전 정복 — 성산에서 우도까지',
    region: '제주',
    regionSlug: 'jeju',
    tag: '여행코스',
    slug: 'jeju-east-coast-drive',
    img: 'https://picsum.photos/seed/jeju-coastal-drive/800/500',
    date: '2026-07-09',
    dateDisplay: '2026.07.09',
    excerpt: '성산일출봉에서 시작해 우도까지, 제주 동쪽 해안을 따라 달리는 반나절 드라이브 코스.',
  },
  {
    title: '부산 로컬이 알려주는 국밥 투어 — 진짜 5곳',
    region: '부산',
    regionSlug: 'busan',
    tag: '맛집',
    slug: 'busan-gukbap-tour',
    img: 'https://picsum.photos/seed/busan-food-market/800/500',
    date: '2026-07-08',
    dateDisplay: '2026.07.08',
    excerpt: '관광객 없는 로컬 국밥집 5곳. 부산 시내 & 서면 & 해운대 근처 엄선.',
  },
  {
    title: '서울 성수 카페 골목 솔직 후기 — 과대평가인가 아닌가',
    region: '서울',
    regionSlug: 'seoul',
    tag: '카페',
    slug: 'seoul-seongsu-cafe',
    img: 'https://picsum.photos/seed/seoul-cafe-alley/800/500',
    date: '2026-07-07',
    dateDisplay: '2026.07.07',
    excerpt: '성수동 카페 10곳 직접 방문 후기. 웨이팅 가치 있는 곳과 그냥 지나쳐도 되는 곳 구분.',
  },
]

const homepageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: '국내여행 가이드 — PICKVOLT',
  description: '서울, 부산, 제주 등 국내 여행지 맛집·숙소·코스 추천',
  url: 'https://pickvolt.com',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', position: 1, name: '홈', item: 'https://pickvolt.com' }],
  },
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageJsonLd) }}
      />

      <div className="bg-white">

        {/* ── HERO ─────────────────────────────────────────── */}
        <section
          aria-label="메인 소개"
          className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-8 items-center"
        >
          <div className="flex flex-col gap-6">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#3B9FDE]">
              국내 여행 미디어
            </p>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#1A2535] leading-[1.05]">
              진짜<br />
              여행의<br />
              기준
            </h1>

            <p className="text-[15px] text-[#6A8AA8] leading-relaxed max-w-[38ch]">
              서울, 부산, 제주부터 경주, 강릉, 전주까지.
              직접 가보고 먹어보고 자본 경험을 담은 국내 여행 가이드.
              복붙 정보 없이, 실제 경험만 씁니다.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/travel"
                className="inline-flex items-center bg-[#3B9FDE] text-white text-sm font-semibold px-6 py-3 rounded-sm hover:bg-[#2d8fce] transition-colors duration-200"
              >
                국내여행 시작하기
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-[#6A8AA8] hover:text-[#1A2535] transition-colors duration-200"
              >
                소개 보기
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[420px] lg:h-[480px] overflow-hidden rounded-sm">
              <Image
                src="https://picsum.photos/seed/korea-travel-scenery/900/700"
                alt="대한민국 국내 여행 풍경"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A2535]/40 to-transparent" />
            </div>
            <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-sm shadow-sm">
              <p className="text-[10px] tracking-[0.16em] uppercase text-[#3B9FDE] font-semibold mb-0.5">지금 인기</p>
              <p className="text-[13px] font-semibold text-[#1A2535]">제주 동쪽 해안 드라이브</p>
            </div>
          </div>
        </section>

        {/* ── REGIONS ──────────────────────────────────────── */}
        <section
          aria-label="지역별 국내여행 가이드"
          className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100"
        >
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-2xl font-bold text-[#1A2535] tracking-tight">
              지역별 국내여행 가이드
            </h2>
            <Link
              href="/travel"
              className="text-[13px] text-[#6A8AA8] hover:text-[#3B9FDE] transition-colors duration-200 font-medium"
            >
              전체 보기
            </Link>
          </div>

          <ul className="grid grid-cols-2 md:grid-cols-3 gap-4 list-none">
            {REGIONS.map((region) => (
              <li key={region.slug}>
                <Link
                  href={`/region/${region.slug}`}
                  title={`${region.keyword} 맛집·숙소·코스 추천`}
                  className="group relative overflow-hidden rounded-sm aspect-[4/3] flex flex-col"
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={region.img}
                      alt={`${region.name} 여행 풍경`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A2535]/70 via-[#1A2535]/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-5">
                      <h3 className="text-white font-bold text-xl tracking-tight leading-none mb-1.5">
                        {region.name}
                      </h3>
                      <p className="text-white/65 text-[12px] font-medium leading-snug">
                        {region.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── LATEST POSTS ─────────────────────────────────── */}
        <section
          aria-label="최신 국내여행 정보"
          className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-100"
        >
          <div className="flex items-end justify-between mb-10">
            <h2 className="text-2xl font-bold text-[#1A2535] tracking-tight">
              최신 여행 정보
            </h2>
            <Link
              href="/travel"
              className="text-[13px] text-[#6A8AA8] hover:text-[#3B9FDE] transition-colors duration-200 font-medium"
            >
              전체 보기
            </Link>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none">
            {PLACEHOLDER_POSTS.map((post) => (
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white bg-[#3B9FDE] px-2 py-0.5 rounded-sm">
                        {post.tag}
                      </span>
                      <Link
                        href={`/region/${post.regionSlug}`}
                        className="text-[11px] text-[#A8BED4] hover:text-[#3B9FDE] transition-colors"
                      >
                        {post.region}
                      </Link>
                    </div>
                    <Link href={`/travel/${post.slug}`} className="block">
                      <h3 className="text-[15px] font-semibold text-[#1A2535] leading-snug group-hover:text-[#3B9FDE] transition-colors duration-200 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-[13px] text-[#6A8AA8] leading-relaxed line-clamp-2 mb-2">
                        {post.excerpt}
                      </p>
                    </Link>
                    <time dateTime={post.date} className="text-[11px] text-[#A8BED4]">
                      {post.dateDisplay}
                    </time>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* ── SEO TEXT BLOCK ────────────────────────────────── */}
        <section
          aria-label="PICKVOLT 소개"
          className="border-t border-gray-100 bg-[#F8FAFE]"
        >
          <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h2 className="text-lg font-bold text-[#1A2535] mb-1">
                광고·협찬 없는 솔직한 국내 여행 정보
              </h2>
              <p className="text-[14px] text-[#6A8AA8] leading-relaxed max-w-[52ch]">
                PICKVOLT는 서울, 부산, 제주, 경주, 강릉, 전주 등 국내 주요 여행지의
                맛집, 숙소, 여행 코스를 직접 경험한 정보로만 구성합니다.
                협찬 없이, 직접 가본 곳만 씁니다.
              </p>
            </div>
            <Link
              href="/about"
              className="inline-flex items-center text-sm font-semibold text-[#3B9FDE] hover:underline underline-offset-4 shrink-0"
            >
              PICKVOLT 소개 보기
            </Link>
          </div>
        </section>

      </div>
    </>
  )
}
