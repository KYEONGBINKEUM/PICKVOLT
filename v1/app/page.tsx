import Navbar from '@/components/Navbar'
import BlogCategoryNav from '@/components/BlogCategoryNav'
import BlogPopularWidget from '@/components/BlogPopularWidget'
import BlogRecentWidget from '@/components/BlogRecentWidget'
import HomeFeed from './HomeFeed'
import type { FeedPost } from '@/components/PostFeed'

export const revalidate = 30

const homeWebsiteSpeakableSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.pickvolt.com/#webpage',
  url: 'https://www.pickvolt.com',
  name: 'Pickvolt — IT News & Insights',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1'],
  },
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_ENV === 'production') return 'https://www.pickvolt.com'
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function getHomePosts(): Promise<FeedPost[]> {
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/community/posts?type=news&sort=latest&page=1&limit=20`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.posts ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const posts = await getHomePosts()

  return (
    <main className="bg-background flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeWebsiteSpeakableSchema) }} />
      <Navbar />
      <div className="max-w-inner mx-auto w-full px-4 sm:px-6 pt-24 pb-8">
        <BlogCategoryNav />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="min-w-0">
            <HomeFeed posts={posts} />
          </div>
          <aside className="hidden lg:flex flex-col gap-6">
            <div className="bg-surface border border-dashed border-border rounded-2xl h-[250px] flex items-center justify-center text-xs text-white/20">
              광고 영역 (AdSense 승인 후 노출)
            </div>
            <BlogPopularWidget />
            <BlogRecentWidget />
            <div className="bg-surface border border-dashed border-border rounded-2xl h-[250px] flex items-center justify-center text-xs text-white/20">
              광고 영역 (AdSense 승인 후 노출)
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
