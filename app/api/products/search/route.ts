import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ results: data ?? [], total: data?.length ?? 0 })
}
