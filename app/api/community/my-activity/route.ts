import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = makeServiceClient()

  const [postsRes, commentsRes] = await Promise.all([
    svc
      .from('community_posts')
      .select('id, title, type, upvotes, comment_count, view_count, created_at')
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(50),
    svc
      .from('community_comments')
      .select('id, body, created_at, post_id, community_posts(id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    posts: postsRes.data ?? [],
    comments: commentsRes.data ?? [],
  })
}
