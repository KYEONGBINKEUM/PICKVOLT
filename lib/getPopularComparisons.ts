import { createClient } from '@supabase/supabase-js'

interface RpcItem { title: string; products: string[]; cnt: number }
interface Product { id: string; name: string; brand: string; image_url: string | null }
interface Verdict { pair_key: string; winner_name: string | null; summary: string | null; comparison_count: number }
interface ReviewStat { product_id: string; review_count: number; avg_rating: number }

export interface TrendingItem {
  title: string
  productA: Product
  productB: Product
  href: string
  cnt: number
  score: number
  verdict: string | null
  verdictCount: number
}

function computeScore(
  cnt: number,
  statA: ReviewStat | undefined,
  statB: ReviewStat | undefined,
): number {
  const reviewBoost = ((statA?.review_count ?? 0) + (statB?.review_count ?? 0)) * 0.5
  const ratingDelta = ((statA?.avg_rating ?? 3) + (statB?.avg_rating ?? 3) - 6.0) * 0.3
  return cnt * 1.0 + reviewBoost + ratingDelta
}

export async function getPopularComparisons(): Promise<TrendingItem[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.rpc('get_popular_comparisons')
    if (error) {
      console.error('[popular] rpc error:', error.message)
      return []
    }

    const pairs: RpcItem[] = (data ?? []).filter((item: RpcItem) => item.products.length === 2)
    if (pairs.length === 0) return []

    const allIds = Array.from(new Set(pairs.flatMap(item => item.products)))

    const [{ data: products }, { data: reviewStats }] = await Promise.all([
      supabase.from('products').select('id, name, brand, image_url').in('id', allIds),
      supabase.from('reviews').select('product_id, rating').in('product_id', allIds),
    ])

    const productMap = new Map<string, Product>(
      (products ?? []).map((p: Product) => [p.id, p])
    )

    const reviewStatMap = new Map<string, ReviewStat>()
    const rawReviews = reviewStats ?? []
    for (const id of allIds) {
      const rows = rawReviews.filter((r: { product_id: string; rating: number }) => r.product_id === id)
      if (rows.length === 0) continue
      const avg = rows.reduce((s: number, r: { rating: number }) => s + (r.rating ?? 0), 0) / rows.length
      reviewStatMap.set(id, { product_id: id, review_count: rows.length, avg_rating: avg })
    }

    const pairKeys = pairs.map(item => [...item.products].sort().join(':'))
    let verdictMap = new Map<string, Verdict>()
    try {
      const { data: verdicts } = await supabase
        .from('comparison_verdicts')
        .select('pair_key, winner_name, summary, comparison_count')
        .in('pair_key', pairKeys)
      verdictMap = new Map<string, Verdict>(
        (verdicts ?? []).map((v: Verdict) => [v.pair_key, v])
      )
    } catch { /* verdict 테이블 없으면 무시 */ }

    return pairs
      .filter(item => productMap.has(item.products[0]) && productMap.has(item.products[1]))
      .map(item => {
        const pairKey = [...item.products].sort().join(':')
        const verdict = verdictMap.get(pairKey)
        const score = computeScore(
          item.cnt,
          reviewStatMap.get(item.products[0]),
          reviewStatMap.get(item.products[1]),
        )
        return {
          title: item.title,
          productA: productMap.get(item.products[0])!,
          productB: productMap.get(item.products[1])!,
          href: `/compare?ids=${item.products.join(',')}`,
          cnt: item.cnt,
          score: Math.round(score * 10) / 10,
          verdict: verdict?.summary ?? null,
          verdictCount: verdict?.comparison_count ?? 0,
        }
      })
      .sort((a, b) => b.score - a.score)
  } catch (e) {
    console.error('[popular] error:', e)
    return []
  }
}
