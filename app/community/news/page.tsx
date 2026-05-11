import NewsClient from './NewsClient'
import type { FeedPost } from '@/components/PostFeed'

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

async function getInitialPosts(): Promise<{ posts: FeedPost[]; total: number }> {
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/community/posts?type=news&sort=latest&page=1&limit=25`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return { posts: [], total: 0 }
    const data = await res.json()
    return { posts: data.posts ?? [], total: data.total ?? 0 }
  } catch {
    return { posts: [], total: 0 }
  }
}

export default async function NewsPage() {
  const { posts, total } = await getInitialPosts()
  return <NewsClient initialPosts={posts.length > 0 ? posts : undefined} initialTotal={total} />
}
