import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RpcItem { title: string; products: string[]; cnt: number }
interface Product { id: string; name: string; brand: string; image_url: string | null }
interface Verdict { pair_key: string; winner_name: string | null; summary: string | null; comparison_count: number }

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

    // 제품 상세 조회
    const { data: products } = await supabase
      .from('products')
      .select('id, name, brand, image_url')
      .in('id', allIds)

    const productMap = new Map<string, Product>(
      (products ?? []).map((p: Product) => [p.id, p])
    )

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
        return {
          title: item.title,
          productA: productMap.get(item.products[0])!,
          productB: productMap.get(item.products[1])!,
          href: `/compare?ids=${item.products.join(',')}`,
          cnt: item.cnt,
          verdict: verdict?.summary ?? null,
          verdictCount: verdict?.comparison_count ?? 0,
        }
      })

    const res = NextResponse.json({ items })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (e) {
    console.error('[popular] error:', e)
    return NextResponse.json({ items: [] })
  }
}
