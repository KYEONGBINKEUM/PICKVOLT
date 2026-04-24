import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RpcItem { title: string; products: string[]; cnt: number }
interface Product { id: string; name: string; brand: string; image_url: string | null }

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

    const items = pairs.map(item => ({
      title: item.title,
      productA: productMap.get(item.products[0]) ?? { id: item.products[0], name: item.products[0], brand: '', image_url: null },
      productB: productMap.get(item.products[1]) ?? { id: item.products[1], name: item.products[1], brand: '', image_url: null },
      href: `/compare?ids=${item.products.join(',')}`,
      cnt: item.cnt,
    }))

    return NextResponse.json({ items })
  } catch (e) {
    console.error('[popular] error:', e)
    return NextResponse.json({ items: [] })
  }
}
