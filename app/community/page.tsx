import type { Metadata } from 'next'
import CommunityClient from './CommunityClient'
import type { FeedPost } from '@/components/PostFeed'

export const metadata: Metadata = {
  title: 'Community — Pickvolt',
  description: 'Join the Pickvolt community. Read tech reviews, compare products, ask questions, and share your experience with other users.',
  alternates: { canonical: 'https://www.pickvolt.com/community' },
  openGraph: {
    title: 'Pickvolt Community',
    description: 'Read tech reviews, compare products, and share your experience.',
    url: 'https://www.pickvolt.com/community',
    siteName: 'Pickvolt',
    type: 'website',
  },
}

const communitySchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': 'https://www.pickvolt.com/community',
  name: 'Pickvolt Community',
  description: 'Tech reviews, product comparisons, Q&A, and discussions by the Pickvolt community.',
  url: 'https://www.pickvolt.com/community',
  isPartOf: { '@id': 'https://www.pickvolt.com/#website' },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.pickvolt.com' },
      { '@type': 'ListItem', position: 2, name: 'Community', item: 'https://www.pickvolt.com/community' },
    ],
  },
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_ENV === 'production') return 'https://www.pickvolt.com'
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function getInitialPosts(): Promise<{ posts: FeedPost[]; total: number }> {
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/community/posts?sort=latest&page=1&limit=25`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return { posts: [], total: 0 }
    const data = await res.json()
    return { posts: data.posts ?? [], total: data.total ?? 0 }
  } catch {
    return { posts: [], total: 0 }
  }
}

export default async function CommunityPage() {
  const { posts, total } = await getInitialPosts()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(communitySchema) }} />
      <CommunityClient initialPosts={posts.length > 0 ? posts : undefined} initialTotal={total} />
    </>
  )
}
