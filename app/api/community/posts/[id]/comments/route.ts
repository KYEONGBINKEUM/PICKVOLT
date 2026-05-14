import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkCommentRateLimit } from '@/lib/rateLimitDb'

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  let userId: string | null = null
  if (token) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anon.auth.getUser(token)
    userId = user?.id ?? null
  }

  const supabase = makeServiceClient()
  const { data: comments, error } = await supabase
    .from('community_comments')
    .select('id, post_id, user_id, user_display_name, user_avatar_url, parent_id, body, upvotes, created_at, is_ai_generated')
    .eq('post_id', id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let myVotedCommentIds = new Set<string>()
  if (userId && comments && comments.length > 0) {
    const cids = comments.map((c: { id: string }) => c.id)
    const { data: votes } = await supabase
      .from('community_comment_votes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', cids)
    myVotedCommentIds = new Set((votes ?? []).map((v: { comment_id: string }) => v.comment_id))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (comments ?? []).map((c: any) => ({ ...c, my_vote: myVotedCommentIds.has(c.id) }))
  return NextResponse.json({ comments: result })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { body, parent_id } = await req.json()
  if (!body?.trim() || body.trim().length < 2) return NextResponse.json({ error: 'body too short' }, { status: 400 })

  const supabase = makeServiceClient()

  // Rate limit check
  const rl = await checkCommentRateLimit(supabase, user.id, body)
  if (rl.blocked) return NextResponse.json({ error: rl.errorCode }, { status: 429 })

  // 실명 노출 방지: profiles 테이블의 nickname + avatar 우선 사용
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const userDisplayName = profile?.nickname ?? user.email?.split('@')[0] ?? 'user'
  const userAvatarUrl   = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id:           id,
      user_id:           user.id,
      user_display_name: userDisplayName,
      user_avatar_url:   userAvatarUrl,
      parent_id:         parent_id ?? null,
      body:              body.trim(),
    })
    .select('id, post_id, user_id, user_display_name, user_avatar_url, parent_id, body, upvotes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notifications (best-effort)
  try {
    const notifInserts: Record<string, unknown>[] = []
    const { data: postData } = await supabase
      .from('community_posts')
      .select('user_id, title')
      .eq('id', id)
      .maybeSingle()

    if (postData && postData.user_id !== user.id) {
      notifInserts.push({
        user_id: postData.user_id,
        type: 'comment',
        title: postData.title,
        body: body.trim().slice(0, 80),
        link: `/community/posts/${id}`,
        actor_id: user.id,
        actor_name: userDisplayName,
        actor_avatar: userAvatarUrl,
      })
    }

    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('id', parent_id)
        .maybeSingle()

      if (parentComment && parentComment.user_id !== user.id && parentComment.user_id !== postData?.user_id) {
        notifInserts.push({
          user_id: parentComment.user_id,
          type: 'reply',
          title: postData?.title ?? '',
          body: body.trim().slice(0, 80),
          link: `/community/posts/${id}`,
          actor_id: user.id,
          actor_name: userDisplayName,
          actor_avatar: userAvatarUrl,
        })
      }
    }

    if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts)
  } catch {}

  // Award points for comment creation (best-effort, with daily cap)
  try {
    const { data: settingsRows } = await supabase
      .from('app_settings').select('key, value')
      .in('key', ['community_points_per_comment', 'community_daily_max_comment_points'])
    const sm: Record<string, string> = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    const pts    = parseInt(sm['community_points_per_comment']          ?? '0')
    const dayMax = parseInt(sm['community_daily_max_comment_points']    ?? '0')

    if (pts > 0) {
      let award = pts
      if (dayMax > 0) {
        const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
        const { data: dayRows } = await supabase
          .from('point_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'comment_reward')
          .gte('created_at', dayStart.toISOString())
        const dayTotal = (dayRows ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0)
        award = Math.max(0, Math.min(pts, dayMax - dayTotal))
      }

      if (award > 0) {
        const { data: pd } = await supabase.from('profiles').select('points').eq('user_id', user.id).maybeSingle()
        const cur = (pd as { points?: number } | null)?.points ?? 0
        await supabase.from('profiles').update({ points: cur + award }).eq('user_id', user.id)
        await supabase.from('point_transactions').insert({
          user_id: user.id, amount: award, type: 'comment_reward',
          description: '댓글 작성 보상', reference_id: data.id,
        })
      }
    }
  } catch {}

  return NextResponse.json({ comment: { ...data, my_vote: false } }, { status: 201 })
}
