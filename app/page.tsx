import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import HomeHeading from './HomeHeading'
import TrendingSection from './TrendingSection'
import { getPopularComparisons } from '@/lib/getPopularComparisons'
import NewsletterSignup from '@/components/NewsletterSignup'

export const revalidate = 0

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const trending = await getPopularComparisons()

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-12 gap-10">
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
      <NewsletterSignup />
    </main>
  )
}
