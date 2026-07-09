import Link from 'next/link'

const REGIONS = [
  { name: '서울', slug: 'seoul', emoji: '🏙️' },
  { name: '부산', slug: 'busan', emoji: '🌊' },
  { name: '제주', slug: 'jeju', emoji: '🍊' },
  { name: '경주', slug: 'gyeongju', emoji: '🏛️' },
  { name: '강릉', slug: 'gangneung', emoji: '🌊' },
  { name: '전주', slug: 'jeonju', emoji: '🥢' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            진짜 여행자의 가이드
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-8">
            직접 가본 곳, 직접 먹어본 곳만 소개합니다
          </p>
          <Link
            href="/travel"
            className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-full hover:bg-blue-50 transition"
          >
            여행지 둘러보기
          </Link>
        </div>
      </section>

      {/* 지역별 탐색 */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">지역별 여행</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {REGIONS.map((region) => (
            <Link
              key={region.slug}
              href={`/region/${region.slug}`}
              className="flex flex-col items-center p-6 bg-gray-50 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition group"
            >
              <span className="text-4xl mb-2">{region.emoji}</span>
              <span className="font-semibold">{region.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 최신 글 */}
      <section className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <h2 className="text-2xl font-bold mb-8">최신 여행 정보</h2>
        <div className="text-gray-500 text-center py-16">
          첫 번째 글을 준비 중입니다 ✈️
        </div>
      </section>
    </div>
  )
}
