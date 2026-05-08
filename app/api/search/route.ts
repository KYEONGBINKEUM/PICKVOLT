import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ posts: [], clans: [] })

  const supabase = makeService()

  const [{ data: posts }, { data: clans }] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id, type, title, user_display_name, created_at')
      .ilike('title', `%${q}%`)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('clans')
      .select('id, slug, name, avatar_url, member_count')
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(5),
  ])

  const res = NextResponse.json({ posts: posts ?? [], clans: clans ?? [] })
  res.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
  return res
}
