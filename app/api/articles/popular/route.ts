import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET /api/articles/popular?limit=5 — 조회수 기준 인기 기사
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '5')))

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('articles')
    .select('id, slug, title, category, thumbnail_url, view_count, published_at')
    .eq('status', 'public')
    .order('view_count', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json({ items: data ?? [] })
  res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
  return res
}
