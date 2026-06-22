import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import HomeHeading from './HomeHeading'
import TrendingSection from './TrendingSection'
import HomeCommunityFeed from './HomeCommunityFeed'
import HomeFaq from './HomeFaq'
import { getPopularComparisons } from '@/lib/getPopularComparisons'

export const revalidate = 0

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const trending = await getPopularComparisons()

  return (
    <main className="bg-background flex flex-col">
      <Navbar />
      {/* 히어로: 뷰포트 전체 높이, 커뮤니티 피드는 스크롤 후 노출 */}
      <div className="min-h-[calc(100svh-64px)] flex flex-col items-center justify-center px-6 pt-16 pb-12 gap-10">
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          <HomeHeading />
          <SearchBar initialQuery={q ?? ''} />
        </div>
        {trending.length > 0 && (
          <div className="w-full max-w-4xl">
            <TrendingSection items={trending} />
          </div>
        )}
      </div>
      <HomeCommunityFeed />
      <HomeFaq />
    </main>
  )
}
