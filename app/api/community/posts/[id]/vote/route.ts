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

  const isNewVote = !existing

  if (existing) {
    await supabase.from('community_post_votes').delete().eq('post_id', id).eq('user_id', user.id)
  } else {
    await supabase.from('community_post_votes').insert({ post_id: id, user_id: user.id })
    if (existingDown) {
      await supabase.from('community_post_downvotes').delete().eq('post_id', id).eq('user_id', user.id)
    }
  }

  // 트리거 의존 없이 실제 카운트로 직접 동기화
  const [{ count: upvoteCount }, { count: downvoteCount }] = await Promise.all([
    supabase.from('community_post_votes').select('*', { count: 'exact', head: true }).eq('post_id', id),
    supabase.from('community_post_downvotes').select('*', { count: 'exact', head: true }).eq('post_id', id),
  ])

  await supabase.from('community_posts').update({
    upvotes: upvoteCount ?? 0,
    downvotes: downvoteCount ?? 0,
  }).eq('id', id)

  // 새 추천 시에만 글 작성자에게 알림 (본인 글 제외, best-effort)
  if (isNewVote) {
    try {
      const [{ data: postData }, { data: profile }] = await Promise.all([
        supabase.from('community_posts').select('user_id, title').eq('id', id).maybeSingle(),
        supabase.from('profiles').select('nickname, avatar_url').eq('user_id', user.id).maybeSingle(),
      ])
      if (postData && postData.user_id !== user.id) {
        const actorName   = profile?.nickname ?? user.email?.split('@')[0] ?? 'user'
        const actorAvatar = profile?.avatar_url ?? null
        await supabase.from('notifications').insert({
          user_id:      postData.user_id,
          type:         'upvote',
          title:        postData.title,
          link:         `/community/posts/${id}`,
          actor_id:     user.id,
          actor_name:   actorName,
          actor_avatar: actorAvatar,
        })
      }
    } catch {}
  }

  return NextResponse.json({
    voted: !existing,
    upvotes: upvoteCount ?? 0,
    downvotes: downvoteCount ?? 0,
    my_downvote: false,
  })
}
