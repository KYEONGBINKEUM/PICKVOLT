import Navbar from '@/components/Navbar'
import BlogCategoryNav from '@/components/BlogCategoryNav'
import BlogPopularWidget from '@/components/BlogPopularWidget'
import BlogRecentWidget from '@/components/BlogRecentWidget'
import HomeFeed from './HomeFeed'
import HomeFaq from './HomeFaq'
import type { FeedPost } from '@/components/PostFeed'

export const revalidate = 30

const homeFaqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is Pickvolt?', acceptedAnswer: { '@type': 'Answer', text: 'Pickvolt is an IT news and information site covering AI, mobile, hardware, software, and more.' } },
    { '@type': 'Question', name: 'How often is new content published?', acceptedAnswer: { '@type': 'Answer', text: 'New articles are published regularly across each category as they become available.' } },
    { '@type': 'Question', name: 'Is Pickvolt free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. All articles are completely free to read.' } },
    { '@type': 'Question', name: 'Can I comment on articles?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Sign in to leave a comment on any article.' } },
  ],
}

const homeWebsiteSpeakableSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.pickvolt.com/#webpage',
  url: 'https://www.pickvolt.com',
  name: 'Pickvolt — IT News & Insights',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', 'details p'],
  },
}

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeFaqSchema) }} />
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
      <HomeFaq />
    </main>
  )
}
