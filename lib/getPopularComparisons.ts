import { createClient } from '@supabase/supabase-js'

interface Product { id: string; name: string; brand: string; image_url: string | null }

export interface TrendingItem {
  productA: Product
  productB: Product
  href: string
  cnt: number
  verdict: string | null
  verdictCount: number
}

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface VerdictRow {
  pair_key: string
  winner_name: string | null
  summary: string | null
  comparison_count: number
  product_ids: string[] | null
}

// 1순위: comparison_verdicts — 비교 횟수 실시간 누적 테이블
async function getFromVerdicts(supabase: ReturnType<typeof makeSupabase>): Promise<VerdictRow[]> {
  const { data, error } = await supabase
    .from('comparison_verdicts')
    .select('pair_key, winner_name, summary, comparison_count, product_ids')
    .order('comparison_count', { ascending: false })
    .limit(10)

  if (error || !data || data.length === 0) return []
  return data as VerdictRow[]
}

// fallback: comparison_history 전체 기간 집계
async function getFromHistory(supabase: ReturnType<typeof makeSupabase>): Promise<VerdictRow[]> {
  const { data } = await supabase
    .from('comparison_history')
    .select('products')

  if (!data || data.length === 0) return []

  const pairCount = new Map<string, { ids: string[]; cnt: number }>()
  for (const row of data) {
    const ids: string[] = row.products ?? []
    if (ids.length !== 2) continue
    const sorted = [...ids].sort()
    const key = sorted.join(':')
    if (!pairCount.has(key)) pairCount.set(key, { ids: sorted, cnt: 0 })
    pairCount.get(key)!.cnt += 1
  }

  return Array.from(pairCount.values())
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 10)
    .map(({ ids, cnt }) => ({
      pair_key: ids.join(':'),
      winner_name: null,
      summary: null,
      comparison_count: cnt,
      product_ids: ids,
    }))
}

export async function getPopularComparisons(): Promise<TrendingItem[]> {
  try {
    const supabase = makeSupabase()

    let rows = await getFromVerdicts(supabase)
    if (rows.length === 0) rows = await getFromHistory(supabase)
    if (rows.length === 0) return []

    // product_ids 컬럼이 없으면 pair_key에서 파싱
    const allIds = Array.from(new Set(
      rows.flatMap(r => r.product_ids ?? r.pair_key.split(':'))
    ))

    const { data: products } = await supabase
      .from('products')
      .select('id, name, brand, image_url')
      .in('id', allIds)

    const productMap = new Map<string, Product>(
      (products ?? []).map((p: Product) => [p.id, p])
    )

    return rows
      .map(r => {
        const ids = r.product_ids ?? r.pair_key.split(':')
        if (ids.length !== 2) return null
        const pA = productMap.get(ids[0])
        const pB = productMap.get(ids[1])
        if (!pA || !pB) return null
        return {
          productA: pA,
          productB: pB,
          href: `/compare?ids=${ids.join(',')}`,
          cnt: r.comparison_count,
          verdict: r.summary ?? null,
          verdictCount: r.comparison_count,
        }
      })
      .filter((item): item is TrendingItem => item !== null)
  } catch (e) {
    console.error('[popular] error:', e)
    return []
  }
}
