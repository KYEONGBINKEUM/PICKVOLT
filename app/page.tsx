import { createClient } from '@supabase/supabase-js'
import ArticleHeader from '@/components/articles/ArticleHeader'
import AdSlot from '@/components/articles/AdSlot'
import HomeHero, { type HomeArticle } from './HomeHero'
import HomeCategorySection from './HomeCategorySection'
import HomePopularTop5 from './HomePopularTop5'

export const revalidate = 60

const HOME_CATEGORY_SECTIONS = ['tech', 'ai'] as const
const HOME_ARTICLE_COLS = 'id, slug, title, summary, category, thumbnail_url, published_at'

function makeSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getHomeData() {
  const empty = {
    hero: null as HomeArticle | null,
    recent: [] as HomeArticle[],
    popular: [] as HomeArticle[],
    categorySections: HOME_CATEGORY_SECTIONS.map((cat) => ({ category: cat, items: [] as HomeArticle[] })),
  }

  try {
    const supabase = makeSupabase()

    const [latestRes, popularRes, ...categoryResList] = await Promise.all([
      supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').order('published_at', { ascending: false }).limit(6),
      supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').order('view_count', { ascending: false }).limit(5),
      ...HOME_CATEGORY_SECTIONS.map((cat) =>
        supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').eq('category', cat).order('published_at', { ascending: false }).limit(3)
      ),
    ])

    const latest = (latestRes.data ?? []) as HomeArticle[]
    const popular = (popularRes.data ?? []) as HomeArticle[]
    const categorySections = HOME_CATEGORY_SECTIONS.map((cat, i) => ({
      category: cat,
      items: (categoryResList[i]?.data ?? []) as HomeArticle[],
    }))

    return {
      hero: latest[0] ?? null,
      recent: latest.slice(1, 6),
      popular,
      categorySections,
    }
  } catch {
    return empty
  }
}

export default async function HomePage() {
  const { hero, recent, popular, categorySections } = await getHomeData()

  return (
    <main className="bg-background min-h-screen flex flex-col">
      <ArticleHeader />

      <div className="max-w-inner mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-10">
        {hero && <HomeHero hero={hero} recent={recent} />}

        <AdSlot variant="infeed" />

        {categorySections[0] && <HomeCategorySection category={categorySections[0].category} items={categorySections[0].items} />}

        {categorySections[1] && <HomeCategorySection category={categorySections[1].category} items={categorySections[1].items} />}

        <AdSlot variant="infeed" />

        <HomePopularTop5 items={popular} />
      </div>
    </main>
  )
}
