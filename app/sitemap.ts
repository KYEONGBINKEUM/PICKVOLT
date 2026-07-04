import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

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
    { url: `${BASE_URL}/`,                      priority: 1.0, changeFrequency: 'daily'   as const, lastModified: now },
    { url: `${BASE_URL}/compare`,               priority: 0.9, changeFrequency: 'daily'   as const, lastModified: now },
    { url: `${BASE_URL}/community`,             priority: 0.8, changeFrequency: 'daily'   as const, lastModified: now },
    { url: `${BASE_URL}/categories/smartphone`, priority: 0.8, changeFrequency: 'weekly'  as const, lastModified: now },
    { url: `${BASE_URL}/categories/laptop`,     priority: 0.8, changeFrequency: 'weekly'  as const, lastModified: now },
    { url: `${BASE_URL}/categories/tablet`,     priority: 0.8, changeFrequency: 'weekly'  as const, lastModified: now },
    ...ARTICLE_CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/articles/category/${cat}`, priority: 0.8, changeFrequency: 'weekly' as const, lastModified: now,
    })),
    { url: `${BASE_URL}/faq`,                   priority: 0.7, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/about`,                 priority: 0.6, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/contact`,               priority: 0.6, changeFrequency: 'monthly' as const, lastModified: now },
    { url: `${BASE_URL}/privacy`,               priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
    { url: `${BASE_URL}/terms`,                 priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
    { url: `${BASE_URL}/cookies`,               priority: 0.4, changeFrequency: 'yearly'  as const, lastModified: now },
  ]

  try {
    const supabase = makeSupabase()

    // --- 1. All product pages ---
    const { data: products } = await supabase
      .from('products')
      .select('id, category, updated_at')
      .eq('is_visible', true)

    const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url:             `${BASE_URL}/product/${p.id}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))

    // --- 2. Popular compare pairs (top 8 per category × all pairs) ---
    const categories = ['smartphone', 'laptop', 'tablet']
    const compareRoutes: MetadataRoute.Sitemap = []

    for (const cat of categories) {
      const { data: top } = await supabase
        .from('products')
        .select('id')
        .eq('is_visible', true)
        .eq('category', cat)
        .order('created_at', { ascending: false })
        .limit(8)

      const ids = (top ?? []).map((p) => p.id)
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          compareRoutes.push({
            url:             `${BASE_URL}/compare?ids=${ids[i]},${ids[j]}`,
            lastModified:    new Date(),
            changeFrequency: 'weekly' as const,
            priority:        0.65,
          })
        }
      }
    }

    // --- 3. Community posts (공개글만) ---
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, updated_at, created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(500) // 최신 500개만

    const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url:             `${BASE_URL}/community/post/${p.id}`,
      lastModified:    p.updated_at ? new Date(p.updated_at) : new Date(p.created_at),
      changeFrequency: 'weekly' as const,
      priority:        0.5,
    }))

    // --- 4. Published articles ---
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'public')
      .order('published_at', { ascending: false })
      .limit(1000)

    const articleRoutes: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
      url:             `${BASE_URL}/articles/${a.slug}`,
      lastModified:    a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority:        0.7,
    }))

    return [...staticRoutes, ...productRoutes, ...compareRoutes, ...postRoutes, ...articleRoutes]
  } catch {
    return staticRoutes
  }
}
