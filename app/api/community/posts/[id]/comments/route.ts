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
    .select('id, post_id, user_id, user_display_name, user_avatar_url, parent_id, body, upvotes, created_at, updated_at')
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
  return NextResponse.json({ comment: { ...data, my_vote: false } }, { status: 201 })
}
