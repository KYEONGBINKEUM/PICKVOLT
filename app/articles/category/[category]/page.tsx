import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticleHeader from '@/components/articles/ArticleHeader'
import ListClient from './ListClient'
import type { ArticleListItem } from './ListClient'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

const CATEGORIES: readonly string[] = ARTICLE_CATEGORIES
const CATEGORY_LABELS: Record<string, string> = {
  tech: '테크', it: 'IT', ai: 'AI', mobile: '모바일', review: '리뷰', security: '보안', startup: '스타트업',
}

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

async function getInitialArticles(category: string): Promise<{ items: ArticleListItem[]; total: number }> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/articles?category=${category}&sort=latest&page=1&limit=12`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return { items: [], total: 0 }
    const data = await res.json()
    return { items: data.items ?? [], total: data.total ?? 0 }
  } catch {
    return { items: [], total: 0 }
  }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params
  if (!CATEGORIES.includes(category)) return {}
  const label = CATEGORY_LABELS[category]
  return {
    title: `${label} — Pickvolt`,
    description: `${label} 관련 최신 기사와 리뷰를 확인하세요.`,
    alternates: { canonical: `https://www.pickvolt.com/articles/category/${category}` },
  }
}

export default async function ArticleCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!CATEGORIES.includes(category)) notFound()

  const { items, total } = await getInitialArticles(category)

  return (
    <main className="bg-background min-h-screen flex flex-col">
      <ArticleHeader />
      <div className="max-w-inner mx-auto w-full px-4 sm:px-6 py-8">
        <ListClient category={category} initialItems={items} initialTotal={total} />
      </div>
    </main>
  )
}
