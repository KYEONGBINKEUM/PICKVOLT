import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RpcItem { title: string; products: string[]; cnt: number }
interface Product { id: string; name: string; brand: string; image_url: string | null }
interface Verdict { pair_key: string; winner_name: string | null; summary: string | null; comparison_count: number }
interface ReviewStat { product_id: string; review_count: number; avg_rating: number }

// Weighted Score (inspired by X/Twitter ranking algorithm)
// pair_score = compare_cnt × 1.0
//            + (reviews_A + reviews_B) × 0.5
//            + (avg_rating_A + avg_rating_B - 6.0) × 0.3   ← positive only above 3★
function computeScore(
  cnt: number,
  statA: ReviewStat | undefined,
  statB: ReviewStat | undefined,
): number {
  const reviewBoost = ((statA?.review_count ?? 0) + (statB?.review_count ?? 0)) * 0.5
  const ratingDelta = ((statA?.avg_rating ?? 3) + (statB?.avg_rating ?? 3) - 6.0) * 0.3
  return cnt * 1.0 + reviewBoost + ratingDelta
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.rpc('get_popular_comparisons')
    if (error) {
      console.error('[popular] rpc error:', error.message)
      return NextResponse.json({ items: [] })
    }

    // 2개짜리 비교만 필터
    const pairs: RpcItem[] = (data ?? []).filter((item: RpcItem) => item.products.length === 2)
    if (pairs.length === 0) return NextResponse.json({ items: [] })

    // 관련 제품 ID 수집
    const allIds = Array.from(new Set(pairs.flatMap(item => item.products)))

    // 제품 상세 조회 + 리뷰 통계 병렬 조회
    const [{ data: products }, { data: reviewStats }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, brand, image_url')
        .in('id', allIds),
      supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', allIds),
    ])

    const productMap = new Map<string, Product>(
      (products ?? []).map((p: Product) => [p.id, p])
    )

    // 리뷰 통계 집계 (count + avg rating per product)
    const reviewStatMap = new Map<string, ReviewStat>()
    const rawReviews = reviewStats ?? []
    for (const id of allIds) {
      const productReviews = rawReviews.filter((r: { product_id: string; rating: number }) => r.product_id === id)
      if (productReviews.length === 0) continue
      const avg = productReviews.reduce((sum: number, r: { rating: number }) => sum + (r.rating ?? 0), 0) / productReviews.length
      reviewStatMap.set(id, { product_id: id, review_count: productReviews.length, avg_rating: avg })
    }

    // 누적 verdict 조회 — 실패해도 trending 표시에 영향 없음
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
    } catch {
      // verdict 테이블 없거나 에러 → 무시하고 계속
    }

    const items = pairs
      .filter(item => productMap.has(item.products[0]) && productMap.has(item.products[1]))
      .map(item => {
        const pairKey = [...item.products].sort().join(':')
        const verdict = verdictMap.get(pairKey)
        const statA = reviewStatMap.get(item.products[0])
        const statB = reviewStatMap.get(item.products[1])
        const score = computeScore(item.cnt, statA, statB)
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
      // Weighted Score 기준으로 정렬
      .sort((a, b) => b.score - a.score)

    const res = NextResponse.json({ items })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (e) {
    console.error('[popular] error:', e)
    return NextResponse.json({ items: [] })
  }
}
