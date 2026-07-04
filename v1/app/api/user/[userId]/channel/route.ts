import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// GET /api/user/[userId]/channel
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')

  let viewerId: string | null = null
  if (token) {
    const { data: { user } } = await makeAnon().auth.getUser(token)
    viewerId = user?.id ?? null
  }

  const supabase = makeService()

  const [profileRes, postCountRes, subscriberCountRes, isSubscribedRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('nickname, avatar_url, bio, is_official')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_hidden', false),
    supabase
      .from('channel_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', userId),
    viewerId && viewerId !== userId
      ? supabase
          .from('channel_subscriptions')
          .select('id')
          .eq('subscriber_id', viewerId)
          .eq('channel_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({
    user_id: userId,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    is_official: profile.is_official ?? false,
    post_count: postCountRes.count ?? 0,
    subscriber_count: subscriberCountRes.count ?? 0,
    is_subscribed: !!(isSubscribedRes as { data: unknown }).data,
    is_own: viewerId === userId,
  })
}
