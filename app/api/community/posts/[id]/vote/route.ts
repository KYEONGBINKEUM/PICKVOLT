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

  const [{ data: existing }, { data: existingDown }, { data: postBefore }] = await Promise.all([
    supabase.from('community_post_votes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_post_downvotes').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('community_posts').select('upvotes, user_id').eq('id', id).maybeSingle(),
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

  // 추천 추가 시 20개 달성 마일스톤 보상 (글 작성자에게 10포인트, 포스트당 1회)
  if (!existing && post && postBefore) {
    const prevUpvotes = postBefore.upvotes ?? 0
    const newUpvotes  = post.upvotes ?? 0
    const authorId    = postBefore.user_id
    // 직전에 19이하 → 이번에 20이상으로 처음 돌파, 자신 글 추천 제외
    if (prevUpvotes < 20 && newUpvotes >= 20 && authorId && authorId !== user.id) {
      try {
        // 해당 포스트에 대해 이미 지급한 적 있으면 스킵
        const { data: alreadyRewarded } = await supabase
          .from('point_transactions')
          .select('id')
          .eq('user_id', authorId)
          .eq('type', 'upvote_milestone')
          .eq('reference_id', id)
          .maybeSingle()
        if (!alreadyRewarded) {
          const { data: pd } = await supabase.from('profiles').select('points').eq('user_id', authorId).maybeSingle()
          const cur = (pd as { points?: number } | null)?.points ?? 0
          await supabase.from('profiles').update({ points: cur + 10 }).eq('user_id', authorId)
          await supabase.from('point_transactions').insert({
            user_id: authorId, amount: 10, type: 'upvote_milestone',
            description: '인기 글 달성 보상 (추천 20개)', reference_id: id,
          })
        }
      } catch {}
    }
  }

  return NextResponse.json({
    voted: !existing,
    upvotes: post?.upvotes ?? 0,
    downvotes: post?.downvotes ?? 0,
    my_downvote: false,
  })
}
