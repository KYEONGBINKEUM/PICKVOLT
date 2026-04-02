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
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

    let query = supabase
      .from('products')
      .select('id, name, brand, category')
      .eq('scrape_status', 'ok')
      .limit(limit)

    if (q) query = query.ilike('name', `%${q}%`)
    if (category) query = query.eq('category', category)
    if (brand) query = query.eq('brand', brand)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message, results: [] }, { status: 500 })
    }

    return NextResponse.json({ results: data ?? [], total: data?.length ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}
