import { createClient } from '@supabase/supabase-js'

interface RpcItem { title: string; products: string[]; cnt: number }
interface Product { id: string; name: string; brand: string; image_url: string | null }
interface Verdict { pair_key: string; winner_name: string | null; summary: string | null; comparison_count: number }

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

// RPC 없을 때 comparison_history에서 직접 집계
async function getFromHistory(supabase: ReturnType<typeof makeSupabase>): Promise<RpcItem[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('comparison_history')
    .select('products')
    .gte('created_at', since)

  if (!data || data.length === 0) return []

  // 2개 제품 쌍만 집계
  const pairCount = new Map<string, { products: string[]; cnt: number }>()
  for (const row of data) {
    const ids: string[] = row.products ?? []
    if (ids.length !== 2) continue
    const key = [...ids].sort().join(':')
    if (!pairCount.has(key)) {
      pairCount.set(key, { products: ids, cnt: 0 })
    }
    pairCount.get(key)!.cnt += 1
  }

  return Array.from(pairCount.values())
    .sort((a, b) => b.cnt - a.cnt)
    .slice(0, 12)
    .map(({ products, cnt }) => ({ title: '', products, cnt }))
}

export async function getPopularComparisons(): Promise<TrendingItem[]> {
  try {
    const supabase = makeSupabase()

    // RPC 시도 → 실패 시 comparison_history 직접 집계로 fallback
    let pairs: RpcItem[] = []
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_popular_comparisons')
    if (rpcError || !rpcData) {
      console.warn('[popular] rpc fallback:', rpcError?.message ?? 'no data')
      pairs = await getFromHistory(supabase)
    } else {
      pairs = (rpcData as RpcItem[]).filter(item => item.products.length === 2)
    }

    if (pairs.length === 0) return []

    const allIds = Array.from(new Set(pairs.flatMap(item => item.products)))

    const { data: products } = await supabase
      .from('products')
      .select('id, name, brand, image_url')
      .in('id', allIds)

    const productMap = new Map<string, Product>(
      (products ?? []).map((p: Product) => [p.id, p])
    )

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
        return {
          productA: productMap.get(item.products[0])!,
          productB: productMap.get(item.products[1])!,
          href: `/compare?ids=${item.products.join(',')}`,
          cnt: item.cnt,
          verdict: verdict?.summary ?? null,
          verdictCount: verdict?.comparison_count ?? 0,
        }
      })
  } catch (e) {
    console.error('[popular] error:', e)
    return []
  }
}
