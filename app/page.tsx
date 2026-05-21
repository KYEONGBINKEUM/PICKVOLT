import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import HomeHeading from './HomeHeading'
import TrendingSection from './TrendingSection'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

interface TrendingCard {
  productA: { id: string; name: string; brand: string; image_url: string | null }
  productB: { id: string; name: string; brand: string; image_url: string | null }
  href: string
  cnt: number
  score?: number
  verdict: string | null
  verdictCount: number
}

async function getTrending(): Promise<TrendingCard[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/compare/popular`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const trending = await getTrending()

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
    </main>
  )
}
