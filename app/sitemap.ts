import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blogCategories'

export const revalidate = 3600

const BASE_URL = 'https://www.pickvolt.com'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                priority: 1.0, changeFrequency: 'daily'   as const, lastModified: now },
    { url: `${BASE_URL}/community/news`,  priority: 0.9, changeFrequency: 'daily'   as const, lastModified: now },
    { url: `${BASE_URL}/faq`,             priority: 0.7, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/about`,           priority: 0.6, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/contact`,         priority: 0.6, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/privacy`,         priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
    { url: `${BASE_URL}/terms`,           priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
    { url: `${BASE_URL}/cookies`,         priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
  ]

  try {
    const supabase = makeSupabase()

    // --- 1. 공개된 블로그 카테고리 페이지 ---
    const { data: catSettings } = await supabase
      .from('blog_category_settings')
      .select('category, is_visible')
      .eq('is_visible', true)
    const visibleCategories = (catSettings ?? [])
      .map((r) => r.category)
      .filter((c) => BLOG_CATEGORY_SLUGS.includes(c))
    const categoryRoutes: MetadataRoute.Sitemap = visibleCategories.map((category) => ({
      url:             `${BASE_URL}/community/news/${category}`,
      lastModified:    now,
      changeFrequency: 'daily' as const,
      priority:        0.7,
    }))

    // --- 2. 공개된 뉴스 글 (type=news, 비공개/초안 제외) ---
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, updated_at, created_at')
      .eq('type', 'news')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(500) // 최신 500개만

    const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url:             `${BASE_URL}/community/posts/${p.id}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(p.created_at),
      changeFrequency: 'weekly' as const,
      priority:        0.6,
    }))

    return [...staticRoutes, ...categoryRoutes, ...postRoutes]
  } catch {
    return staticRoutes
  }
}
