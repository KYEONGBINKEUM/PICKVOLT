import { notFound } from 'next/navigation'
import NewsClient from '../NewsClient'
import { BLOG_CATEGORIES, BLOG_CATEGORY_SLUGS } from '@/lib/blogCategories'
import type { FeedPost } from '@/components/PostFeed'

const BASE_URL = 'https://www.pickvolt.com'

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_ENV === 'production') return 'https://www.pickvolt.com'
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

const CATEGORY_LABELS_KO: Record<string, string> = {
  ai: 'AI',
  mobile: '모바일',
  pc_laptop: 'PC&노트북',
  hardware: '하드웨어',
  software: '소프트웨어',
  platform: '인터넷&플랫폼',
  security: '보안',
  cloud: '클라우드',
  semiconductor: '반도체',
  game: '게임',
  mobility: '모빌리티',
}

async function isCategoryVisible(category: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/blog-category-settings`, { next: { revalidate: 60 } })
    if (!res.ok) return false
    const data = await res.json()
    const row = (data.settings ?? []).find((s: { category: string; is_visible: boolean }) => s.category === category)
    return !!row?.is_visible
  } catch {
    return false
  }
}

async function getInitialPosts(category: string): Promise<{ posts: FeedPost[]; total: number }> {
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/community/posts?type=news&category=${category}&sort=latest&page=1&limit=25`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return { posts: [], total: 0 }
    const data = await res.json()
    return { posts: data.posts ?? [], total: data.total ?? 0 }
  } catch {
    return { posts: [], total: 0 }
  }
}

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((category) => ({ category }))
}

export default async function BlogCategoryNewsPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  if (!BLOG_CATEGORY_SLUGS.includes(category)) notFound()
  if (!(await isCategoryVisible(category))) notFound()

  const { posts, total } = await getInitialPosts(category)
  const label = CATEGORY_LABELS_KO[category] ?? category

  const categorySchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: label, item: `${BASE_URL}/community/news/${category}` },
        ],
      },
      {
        '@type': 'CollectionPage',
        name: `${label} — Pickvolt`,
        description: `${label} 관련 최신 IT 뉴스와 정보`,
        url: `${BASE_URL}/community/news/${category}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categorySchema) }}
      />
      <NewsClient
        initialPosts={posts.length > 0 ? posts : undefined}
        initialTotal={total}
        category={category}
        heading={label}
      />
    </>
  )
}
