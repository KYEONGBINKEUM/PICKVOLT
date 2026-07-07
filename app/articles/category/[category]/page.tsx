import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ArticleHeader from '@/components/articles/ArticleHeader'
import ListClient from './ListClient'
import type { ArticleListItem } from './ListClient'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

const CATEGORIES: readonly string[] = ARTICLE_CATEGORIES
const CATEGORY_LABELS: Record<string, string> = {
  tech: '테크', it: 'IT', ai: 'AI', mobile: '모바일', review: '리뷰', security: '보안', startup: '스타트업',
}

function makeSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getInitialArticles(category: string): Promise<{ items: ArticleListItem[]; total: number }> {
  try {
    const supabase = makeSupabase()
    const cols = 'id, slug, title, summary, category, thumbnail_url, published_at'
    const [{ data, error }, { count }] = await Promise.all([
      supabase.from('articles').select(cols).eq('status', 'public').eq('category', category)
        .order('published_at', { ascending: false }).range(0, 11),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'public').eq('category', category),
    ])
    if (error) return { items: [], total: 0 }
    return { items: (data ?? []) as ArticleListItem[], total: count ?? 0 }
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
