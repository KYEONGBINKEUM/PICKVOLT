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

// POST: 비추천 토글 — 추천과 동시 불가
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()

  const [{ data: existing }, { data: existingUp }] = await Promise.all([
    supabase.from('community_post_downvotes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_post_votes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
  ])

  if (existing) {
    await supabase.from('community_post_downvotes').delete().eq('post_id', id).eq('user_id', user.id)
  } else {
    await supabase.from('community_post_downvotes').insert({ post_id: id, user_id: user.id })
    if (existingUp) {
      await supabase.from('community_post_votes').delete().eq('post_id', id).eq('user_id', user.id)
    }
  }

  // 트리거 의존 없이 실제 카운트로 직접 동기화
  const [{ count: downvoteCount }, { count: upvoteCount }] = await Promise.all([
    supabase.from('community_post_downvotes').select('*', { count: 'exact', head: true }).eq('post_id', id),
    supabase.from('community_post_votes').select('*', { count: 'exact', head: true }).eq('post_id', id),
  ])

  await supabase.from('community_posts').update({
    downvotes: downvoteCount ?? 0,
    upvotes: upvoteCount ?? 0,
  }).eq('id', id)

  return NextResponse.json({
    voted: !existing,
    downvotes: downvoteCount ?? 0,
    upvotes: upvoteCount ?? 0,
    my_vote: false,
  })
}
