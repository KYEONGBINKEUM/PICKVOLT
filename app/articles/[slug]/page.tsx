import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ArticleHeader from '@/components/articles/ArticleHeader'
import AdSlot from '@/components/articles/AdSlot'
import ArticleBody from './ArticleBody'
import ArticleSidebar from './ArticleSidebar'
import RelatedArticles from './RelatedArticles'
import { CategoryBadge, ArticleMetaLine, TagList } from './ArticleMeta'

export const revalidate = 60

const BASE_URL = 'https://www.pickvolt.com'
const CATEGORY_LABELS: Record<string, string> = {
  tech: '테크', it: 'IT', ai: 'AI', mobile: '모바일', review: '리뷰', security: '보안', startup: '스타트업',
}

interface Article {
  id: string
  slug: string
  title: string
  summary: string
  content_html: string
  category: string
  tags: string[]
  thumbnail_url: string | null
  author_name: string
  view_count: number
  read_minutes: number
  published_at: string | null
  updated_at: string
}

function makeSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const supabase = makeSupabase()
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, summary, content_html, category, tags, thumbnail_url, author_name, view_count, read_minutes, published_at, updated_at')
      .eq('slug', slug)
      .in('status', ['public', 'unlisted'])
      .single()
    if (error || !data) return null
    return data as Article
  } catch {
    return null
  }
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) return {}
  const url = `${BASE_URL}/articles/${slug}`
  return {
    title: `${article.title} — Pickvolt`,
    description: article.summary || article.title,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary,
      url,
      siteName: 'Pickvolt',
      images: article.thumbnail_url ? [{ url: article.thumbnail_url }] : undefined,
    },
  }
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = await getArticle(slug)
  if (!article) notFound()

  const related = await (async () => {
    try {
      const supabase = makeSupabase()
      const { data } = await supabase
        .from('articles')
        .select('id, slug, title, category, thumbnail_url, published_at')
        .eq('category', article.category)
        .eq('status', 'public')
        .neq('id', article.id)
        .order('published_at', { ascending: false })
        .limit(4)
      return data
    } catch {
      return null
    }
  })()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    author: { '@type': 'Organization', name: article.author_name || 'Pickvolt' },
    publisher: { '@type': 'Organization', name: 'Pickvolt' },
    datePublished: article.published_at,
    dateModified: article.updated_at,
    url: `${BASE_URL}/articles/${slug}`,
    image: article.thumbnail_url ?? undefined,
    articleSection: CATEGORY_LABELS[article.category] ?? article.category,
    inLanguage: 'ko-KR',
  }

  return (
    <main className="bg-background min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleHeader />

      <div className="max-w-inner mx-auto w-full px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
        <article>
          {article.thumbnail_url && (
            <div className="w-full aspect-video rounded-card overflow-hidden mb-5 bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.thumbnail_url} alt={article.title} className="w-full h-full object-cover" />
            </div>
          )}

          <CategoryBadge category={article.category} />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">{article.title}</h1>
          <ArticleMetaLine
            publishedAt={formatDate(article.published_at)}
            updatedAt={formatDate(article.updated_at)}
            authorName={article.author_name}
            readMinutes={article.read_minutes}
          />
          {article.summary && <p className="text-base text-white/70 leading-relaxed mb-6">{article.summary}</p>}

          <div className="mb-6">
            <AdSlot variant="banner" />
          </div>

          <ArticleBody slug={article.slug} html={article.content_html} />

          <div className="my-6">
            <AdSlot variant="banner" />
          </div>

          <TagList tags={article.tags} />

          <RelatedArticles items={related ?? []} />
        </article>

        <ArticleSidebar contentHtml={article.content_html} />
      </div>
    </main>
  )
}
