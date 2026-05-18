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

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: postId, commentId } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data: comment } = await supabase
    .from('community_comments')
    .select('user_id, post_id')
    .eq('id', commentId)
    .single()
  if (!comment) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const isAdmin = ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
  if (comment.user_id !== user.id && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // 하드 삭제 (ON DELETE CASCADE로 답글 전체 자동 삭제)
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // comment_count 재동기화
  try {
    const { count } = await supabase
      .from('community_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
    await supabase.from('community_posts').update({ comment_count: count ?? 0 }).eq('id', postId)
  } catch {}

  return NextResponse.json({ ok: true })
}
