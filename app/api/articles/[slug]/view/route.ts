import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/articles/[slug]/view — 조회수 +1 (공개, fire-and-forget)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = makeServiceClient()

  const { data: cur } = await supabase
    .from('articles')
    .select('view_count')
    .eq('slug', slug)
    .in('status', ['public', 'unlisted'])
    .single()

  if (!cur) return NextResponse.json({ ok: false }, { status: 404 })

  await supabase.from('articles').update({ view_count: (cur.view_count ?? 0) + 1 }).eq('slug', slug)
  return NextResponse.json({ ok: true })
}
