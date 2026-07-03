import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// GET /api/channels/feed?page=1&limit=20&sort=latest
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const sort  = searchParams.get('sort') ?? 'latest'

  const supabase = makeService()

  // Get list of subscribed channel IDs
  const { data: subs } = await supabase
    .from('channel_subscriptions')
    .select('channel_id')
    .eq('subscriber_id', user.id)

  const channelIds = (subs ?? []).map((s: { channel_id: string }) => s.channel_id)
  if (channelIds.length === 0) return NextResponse.json({ posts: [], total: 0 })

  const offset = (page - 1) * limit

  let query = supabase
    .from('community_posts')
    .select(`
      id, type, category, title, body, rating, upvotes, comment_count, view_count,
      created_at, user_id, user_display_name, user_avatar_url,
      is_bot, source_url, source_name,
      community_post_products ( product_id, products ( id, name, image_url ) ),
      community_compare_options ( id, label, image_url, vote_count, sort_order, product_id )
    `)
    .in('user_id', channelIds)
    .eq('is_hidden', false)

  const { count } = await supabase
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .in('user_id', channelIds)
    .eq('is_hidden', false)

  if (sort === 'hot') {
    query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
  } else if (sort === 'top') {
    query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch my votes
  let myVotedIds = new Set<string>()
  if (data && data.length > 0) {
    const postIds = data.map((p: { id: string }) => p.id)
    const { data: votes } = await supabase
      .from('community_post_votes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
    myVotedIds = new Set((votes ?? []).map((v: { post_id: string }) => v.post_id))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (data ?? []).map((p: any) => ({
    ...p,
    my_vote: myVotedIds.has(p.id),
    community_compare_options: (p.community_compare_options ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  }))

  return NextResponse.json({ posts, total: count ?? 0 })
}
