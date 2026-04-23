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

// POST: 추천 토글 — 비추천과 동시 불가
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()

  const [{ data: existing }, { data: existingDown }] = await Promise.all([
    supabase.from('community_post_votes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_post_downvotes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
  ])

  if (existing) {
    // 이미 추천 → 취소
    await supabase.from('community_post_votes').delete().eq('post_id', id).eq('user_id', user.id)
  } else {
    // 추천 추가 + 비추천 제거(있으면)
    await supabase.from('community_post_votes').insert({ post_id: id, user_id: user.id })
    if (existingDown) {
      await supabase.from('community_post_downvotes').delete().eq('post_id', id).eq('user_id', user.id)
      const { data: p } = await supabase.from('community_posts').select('downvotes').eq('id', id).single()
      await supabase.from('community_posts').update({ downvotes: Math.max(0, (p?.downvotes ?? 1) - 1) }).eq('id', id)
    }
  }

  const { data: post } = await supabase.from('community_posts').select('upvotes, downvotes').eq('id', id).single()
  return NextResponse.json({
    voted: !existing,
    upvotes: post?.upvotes ?? 0,
    downvotes: post?.downvotes ?? 0,
    my_downvote: false,
  })
}
