import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ArticleHeader from '@/components/articles/ArticleHeader'
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

  const catLabel = CATEGORY_LABELS[article.category] ?? article.category

  return (
    <main style={{ background: '#0E0E0E', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleHeader />

      {/* Article layout: 1fr 240px grid */}
      <div className="pv-article-layout" style={{ maxWidth: 1260, margin: '0 auto', padding: '18px 20px 0', display: 'grid', gridTemplateColumns: '1fr 240px', gap: 28, alignItems: 'start' }}>

        {/* Main content */}
        <main style={{ minWidth: 0 }}>
          {/* Hero image */}
          {article.thumbnail_url && (
            <div style={{ marginBottom: 22 }}>
              <img src={article.thumbnail_url} alt={article.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', background: '#1A1A1A' }} />
            </div>
          )}

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#777777', marginBottom: 10 }}>
            <Link href="/" style={{ color: '#777777' }} className="pv-art-bc-link">홈</Link>
            <span style={{ color: '#777777' }}>›</span>
            <Link href={`/articles/category/${article.category}`} style={{ color: '#777777' }} className="pv-art-bc-link">{catLabel}</Link>
            <span style={{ color: '#777777' }}>›</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{article.title}</span>
          </nav>

          {/* Article header */}
          <header>
            <CategoryBadge category={article.category} />
            <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.025em', marginBottom: 12 }}>{article.title}</h1>
            <ArticleMetaLine
              publishedAt={formatDate(article.published_at)}
              updatedAt={formatDate(article.updated_at)}
              authorName={article.author_name}
              readMinutes={article.read_minutes}
            />
            {article.summary && (
              <p style={{ fontSize: 18, color: '#EDEDED', lineHeight: 1.8, opacity: 0.85, padding: '18px 0 20px', borderBottom: '1px solid #2A2A2A', marginBottom: 26 }}>
                {article.summary}
              </p>
            )}
          </header>

          {/* Top ad banner — uncomment when AdSense is approved
          <div style={{ height: 80, width: '100%', background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '12px 0', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>광고 슬롯</span>
            <span style={{ fontSize: 11, color: '#CCCCCC' }}>PC 728×90 / 모바일 320×100</span>
          </div>
          */}

          {/* Article body */}
          <ArticleBody slug={article.slug} html={article.content_html} />

          {/* Bottom ad banner — uncomment when AdSense is approved
          <div style={{ height: 80, width: '100%', background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '12px 0', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>광고 슬롯</span>
            <span style={{ fontSize: 11, color: '#CCCCCC' }}>PC 728×90 / 모바일 320×100</span>
          </div>
          */}

          <TagList tags={article.tags} />
          <RelatedArticles items={related ?? []} />
        </main>

        {/* Sidebar */}
        <ArticleSidebar contentHtml={article.content_html} />
      </div>

      <style>{`
        .pv-art-bc-link:hover { color: #FF4D00; }
        @media (max-width: 1024px) {
          .pv-article-layout { grid-template-columns: 1fr !important; padding: 16px 16px 0 !important; }
        }
        @media (max-width: 768px) {
          .pv-article-layout h1 { font-size: 24px !important; }
        }
        @media (max-width: 520px) {
          .pv-article-layout h1 { font-size: 21px !important; }
        }
      `}</style>
    </main>
  )
}
