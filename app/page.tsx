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

const PLACEHOLDER_ARTICLES: HomeArticle[] = [
  { id: 'p1', slug: '#', title: '구글 제미나이 2.5 Ultra 발표: GPT-5를 실제로 넘어섰는가, 6가지 항목 직접 비교', summary: '추론·코딩·멀티모달 벤치마크에서 사상 첫 GPT-5 역전이 확인됐다. 그러나 실사용 체감은 다를 수 있다.', category: 'tech', thumbnail_url: null, published_at: '2026-07-03T00:00:00Z' },
  { id: 'p2', slug: '#', title: '국내 AI 스타트업 절반이 시리즈 A 이전에 폐업하는 이유', summary: '자금·시장·기술 세 가지 관점에서 분석한 생존 조건.', category: 'it', thumbnail_url: null, published_at: '2026-07-03T00:00:00Z' },
  { id: 'p3', slug: '#', title: '삼성 갤럭시 S27 울트라 최종 유출 스펙 총정리', summary: '카메라·배터리·가격까지 공개된 모든 정보를 한 곳에.', category: 'mobile', thumbnail_url: null, published_at: '2026-07-02T00:00:00Z' },
  { id: 'p4', slug: '#', title: '애플 WWDC 2026 핵심 발표 한눈에 보기: iOS 20 무엇이 달라졌나', summary: '디자인, AI, 개인정보 보호까지 핵심만 추렸다.', category: 'tech', thumbnail_url: null, published_at: '2026-07-01T00:00:00Z' },
  { id: 'p5', slug: '#', title: '클로드 4 vs GPT-5: 현직 개발자 두 달 실사용 비교', summary: '코드 생성·디버깅·문서화 세 분야에서 어느 쪽이 더 실용적인지 결론.', category: 'ai', thumbnail_url: null, published_at: '2026-07-01T00:00:00Z' },
  { id: 'p6', slug: '#', title: '카카오·네이버 개인정보 유출 사태 전말과 기업 대응 현황', summary: '피해 규모와 후속 조치를 타임라인으로 정리했다.', category: 'security', thumbnail_url: null, published_at: '2026-06-30T00:00:00Z' },
]

const PLACEHOLDER_TECH: HomeArticle[] = [
  { id: 't1', slug: '#', title: 'M4 맥북 프로 vs AMD 라이젠 AI 9 노트북: 2026년 최강 노트북은', summary: 'Apple Silicon의 효율성과 Windows AI 칩의 원시 성능을 7개 시나리오로 비교했다.', category: 'tech', thumbnail_url: null, published_at: '2026-07-02T00:00:00Z' },
  { id: 't2', slug: '#', title: '에어팟 프로 3세대 출시 예정: 달라지는 점 5가지 완전 정리', summary: '건강 센서 추가, 케이스 디자인 변경, 가격 인상 여부까지 유출된 모든 정보.', category: 'tech', thumbnail_url: null, published_at: '2026-07-01T00:00:00Z' },
  { id: 't3', slug: '#', title: '아이폰 16 Pro 2주 실사용 리뷰: 구매 전 반드시 알아야 할 것들', summary: '배터리, 카메라 제어 버튼, A18 Pro 칩 실성능을 솔직하게 평가한다.', category: 'review', thumbnail_url: null, published_at: '2026-06-30T00:00:00Z' },
  { id: 't4', slug: '#', title: '인텔 코어 Ultra 300 실성능: 제조사 벤치마크 vs 실제 게임 결과', summary: '공식 자료와 실사용 차이가 15~30% 이상 나는 항목이 3개 발견됐다.', category: 'tech', thumbnail_url: null, published_at: '2026-06-29T00:00:00Z' },
]

const PLACEHOLDER_AI: HomeArticle[] = [
  { id: 'a1', slug: '#', title: '클로드 4 vs GPT-5: 현직 개발자가 실제로 두 달 써본 솔직 비교', summary: '코드 생성·디버깅·문서화 세 분야에서 어느 쪽이 더 실용적인지 결론을 냈다.', category: 'ai', thumbnail_url: null, published_at: '2026-07-03T00:00:00Z' },
  { id: 'a2', slug: '#', title: '카카오·네이버 AI 서비스 비교: 한국어 특화 LLM 현주소', summary: '영어 거대 모델과의 성능 격차는 여전하지만, 한국형 특화 영역에서 우위를 찾았다.', category: 'it', thumbnail_url: null, published_at: '2026-07-02T00:00:00Z' },
  { id: 'a3', slug: '#', title: '2026 국내 클라우드 시장 점유율: AWS·Azure·네이버클라우드 현황', summary: 'IDC 최신 보고서 기반으로 국내 기업의 클라우드 전환 속도와 선택 패턴을 분석한다.', category: 'it', thumbnail_url: null, published_at: '2026-07-01T00:00:00Z' },
  { id: 'a4', slug: '#', title: 'SKT·KT AI 비서 비교: 실제 업무에서 얼마나 쓸 수 있나', summary: '6가지 업무 시나리오에서 두 통신사의 AI 서비스를 직접 테스트한 결과다.', category: 'ai', thumbnail_url: null, published_at: '2026-06-30T00:00:00Z' },
]

const PLACEHOLDER_POPULAR: HomeArticle[] = [
  { id: 'pp1', slug: '#', title: '챗GPT 유료 해지하고 무료로 더 잘 쓰는 방법 — 실제로 가능한가', summary: '', category: 'tech', thumbnail_url: null, published_at: '2026-07-01T00:00:00Z' },
  { id: 'pp2', slug: '#', title: '갤럭시 S27 울트라 유출 스펙 총정리: 결국 이 가격에 나온다', summary: '', category: 'tech', thumbnail_url: null, published_at: '2026-06-29T00:00:00Z' },
  { id: 'pp3', slug: '#', title: '구글 I/O 2026 핵심 정리: 제미나이가 모든 제품에 들어간다', summary: '', category: 'ai', thumbnail_url: null, published_at: '2026-06-28T00:00:00Z' },
  { id: 'pp4', slug: '#', title: 'LG 올레드 TV 신제품 vs 삼성 QLED: 2026년 실제 구매 가이드', summary: '', category: 'it', thumbnail_url: null, published_at: '2026-06-27T00:00:00Z' },
  { id: 'pp5', slug: '#', title: '애플 WWDC 2026 발표 내용 전체 목록: iOS 20부터 Apple Intelligence 2까지', summary: '', category: 'tech', thumbnail_url: null, published_at: '2026-06-26T00:00:00Z' },
]

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

    // DB 데이터 없으면 플레이스홀더로 fallback
    if (latest.length === 0) {
      return {
        hero: PLACEHOLDER_ARTICLES[0],
        recent: PLACEHOLDER_ARTICLES.slice(1, 6),
        popular: PLACEHOLDER_POPULAR,
        categorySections: [
          { category: 'tech', items: PLACEHOLDER_TECH },
          { category: 'ai', items: PLACEHOLDER_AI },
        ],
      }
    }

    return { hero: latest[0] ?? null, recent: latest.slice(1, 6), popular, categorySections }
  } catch {
    return {
      hero: PLACEHOLDER_ARTICLES[0],
      recent: PLACEHOLDER_ARTICLES.slice(1, 6),
      popular: PLACEHOLDER_POPULAR,
      categorySections: [
        { category: 'tech', items: PLACEHOLDER_TECH },
        { category: 'ai', items: PLACEHOLDER_AI },
      ],
    }
  }
}

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

export default async function HomePage() {
  const { hero, recent, popular, categorySections } = await getHomeData()

  return (
    <main style={{ background: '#0E0E0E', minHeight: '100vh' }}>
      <ArticleHeader />

      {hero && <HomeHero hero={hero} recent={recent} />}

      <InfeedAd />

      {categorySections.map((sec) => (
        <HomeCategorySection key={sec.category} category={sec.category} items={sec.items} />
      ))}

      <div style={{ marginTop: 6 }}>
        <InfeedAd />
      </div>

      <HomePopularTop5 items={popular} />

      <div style={{ height: 60 }} />
    </main>
  )
}
