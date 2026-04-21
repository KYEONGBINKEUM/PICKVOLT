import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  return user ?? null
}

// POST: 추천 토글 (없으면 추가, 있으면 취소)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()

  const { data: existing } = await supabase
    .from('community_post_votes')
    .select('post_id')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('community_post_votes').delete().eq('post_id', id).eq('user_id', user.id)
  } else {
    await supabase.from('community_post_votes').insert({ post_id: id, user_id: user.id })
  }

  const { data: post } = await supabase.from('community_posts').select('upvotes').eq('id', id).single()
  return NextResponse.json({ voted: !existing, upvotes: post?.upvotes ?? 0 })
}
