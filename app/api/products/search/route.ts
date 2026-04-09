import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: `missing env: url=${!!url} key=${!!key}`, results: [] },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''
    const category = searchParams.get('category') ?? ''
    const brand = searchParams.get('brand') ?? ''
    let query = supabase
      .from('products')
      .select('id, name, brand, category, specs_common(launch_year, cpus(relative_score))')
      .eq('is_visible', true)

    if (q) query = query.ilike('name', `%${q}%`)
    if (category) query = query.eq('category', category)
    if (brand) query = query.eq('brand', brand)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message, results: [] }, { status: 500 })
    }

    // 성능 점수 1순위, 출시연도 2순위 정렬
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = (data ?? []).sort((a: any, b: any) => {
      const aScore = a.specs_common?.cpus?.relative_score ?? 0
      const bScore = b.specs_common?.cpus?.relative_score ?? 0
      if (bScore !== aScore) return bScore - aScore
      const aYear = a.specs_common?.launch_year ?? 0
      const bYear = b.specs_common?.launch_year ?? 0
      return bYear - aYear
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = sorted.map(({ specs_common: _sc, ...rest }: any) => rest)

    return NextResponse.json({ results, total: results.length })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}
