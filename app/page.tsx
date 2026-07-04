import { createClient } from '@supabase/supabase-js'
import ArticleHeader from '@/components/articles/ArticleHeader'
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
  try {
    const supabase = makeSupabase()

    const [latestRes, popularRes, ...categoryResList] = await Promise.all([
      supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').order('published_at', { ascending: false }).limit(6),
      supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').order('view_count', { ascending: false }).limit(5),
      ...HOME_CATEGORY_SECTIONS.map((cat) =>
        supabase.from('articles').select(HOME_ARTICLE_COLS).eq('status', 'public').eq('category', cat).order('published_at', { ascending: false }).limit(4)
      ),
    ])

    const latest = (latestRes.data ?? []) as HomeArticle[]
    const popular = (popularRes.data ?? []) as HomeArticle[]
    const categorySections = HOME_CATEGORY_SECTIONS.map((cat, i) => ({
      category: cat,
      items: (categoryResList[i]?.data ?? []) as HomeArticle[],
    }))

    return { hero: latest[0] ?? null, recent: latest.slice(1, 6), popular, categorySections }
  } catch {
    return { hero: null, recent: [], popular: [], categorySections: [] }
  }
}

/* InfeedAd — uncomment when AdSense is approved
function InfeedAd() {
  return (
    <div style={{ maxWidth: 1260, margin: '0 auto', padding: '14px 20px' }}>
      <div style={{ background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <div style={{ width: 110, height: 76, flexShrink: 0, background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#777777' }}>광고 이미지</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#BBBBBB', marginBottom: 4 }}>광고</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#EDEDED', marginBottom: 3 }}>인피드 광고 슬롯 — 카드와 동일한 시각 언어로 표시</p>
          <p style={{ fontSize: 14, color: '#777777' }}>브랜드 또는 제품명 설명 문구가 여기에 들어갑니다.</p>
          <p style={{ fontSize: 12, color: '#16A34A', marginTop: 2 }}>ad.example.com</p>
        </div>
      </div>
    </div>
  )
}
*/

export default async function HomePage() {
  const { hero, recent, popular, categorySections } = await getHomeData()

  return (
    <main style={{ background: '#0E0E0E', minHeight: '100vh' }}>
      <ArticleHeader />

      {hero && <HomeHero hero={hero} recent={recent} />}

      {/* <InfeedAd /> */}

      {categorySections.map((sec) => (
        <HomeCategorySection key={sec.category} category={sec.category} items={sec.items} />
      ))}

      {/* <div style={{ marginTop: 6 }}><InfeedAd /></div> */}

      <HomePopularTop5 items={popular} />

      <div style={{ height: 60 }} />
    </main>
  )
}
