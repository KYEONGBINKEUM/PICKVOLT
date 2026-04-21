import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const anon = makeAnonClient()
  const { data: { user } } = await anon.auth.getUser(token)
  return user ?? null
}

// GET /api/community/posts?type=review&category=laptop&sort=hot&page=1&limit=20&product_id=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type       = searchParams.get('type')       ?? ''
  const category   = searchParams.get('category')   ?? ''
  const sort       = searchParams.get('sort')        ?? 'latest'   // latest | hot | top
  const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit      = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const product_id = searchParams.get('product_id') ?? ''

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  let userId: string | null = null
  if (token) {
    const anon = makeAnonClient()
    const { data: { user } } = await anon.auth.getUser(token)
    userId = user?.id ?? null
  }

  const supabase = makeServiceClient()

  let query = supabase
    .from('community_posts')
    .select(`
      id, type, category, title, body, rating, upvotes, comment_count, view_count,
      is_pinned, created_at, updated_at,
      user_id, user_display_name, user_avatar_url,
      community_post_products ( product_id, products ( id, name, image_url ) ),
      community_compare_options ( id, label, image_url, vote_count, sort_order, product_id )
    `)
    .eq('is_hidden', false)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)

  if (product_id) {
    // 특정 제품에 연결된 게시물만 (제품 상세 페이지용)
    const { data: linked } = await supabase
      .from('community_post_products')
      .select('post_id')
      .eq('product_id', product_id)
    const ids = (linked ?? []).map((r: { post_id: string }) => r.post_id)
    if (ids.length === 0) return NextResponse.json({ posts: [], total: 0 })
    query = query.in('id', ids)
  }

  const offset = (page - 1) * limit

  if (sort === 'hot') {
    query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
  } else if (sort === 'top') {
    query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 내 upvote 여부
  let myVotedIds = new Set<string>()
  if (userId && data && data.length > 0) {
    const ids = data.map((p: { id: string }) => p.id)
    const { data: votes } = await supabase
      .from('community_post_votes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', ids)
    myVotedIds = new Set((votes ?? []).map((v: { post_id: string }) => v.post_id))
  }

  // 내 비교투표 선택
  let myCompareVotes: Record<string, string> = {}
  if (userId && data && data.length > 0) {
    const ids = data.filter((p: { type: string }) => p.type === 'compare').map((p: { id: string }) => p.id)
    if (ids.length > 0) {
      const { data: cvotes } = await supabase
        .from('community_compare_votes')
        .select('post_id, option_id')
        .eq('user_id', userId)
        .in('post_id', ids)
      myCompareVotes = Object.fromEntries((cvotes ?? []).map((v: { post_id: string; option_id: string }) => [v.post_id, v.option_id]))
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (data ?? []).map((p: any) => ({
    ...p,
    my_vote: myVotedIds.has(p.id),
    my_compare_option: myCompareVotes[p.id] ?? null,
    community_compare_options: (p.community_compare_options ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
  }))

  return NextResponse.json({ posts, total: count ?? posts.length })
}

// POST /api/community/posts
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, category, title, body: postBody, rating, product_ids, compare_options, display_name, avatar_url } = body

  if (!type || !title?.trim()) return NextResponse.json({ error: 'type and title required' }, { status: 400 })
  if (type === 'review' && !category) return NextResponse.json({ error: 'category required for review' }, { status: 400 })
  if (type === 'compare' && (!compare_options || compare_options.length < 2)) {
    return NextResponse.json({ error: 'compare requires at least 2 options' }, { status: 400 })
  }

  const supabase = makeServiceClient()

  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      user_display_name: display_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'user',
      user_avatar_url: avatar_url ?? user.user_metadata?.avatar_url ?? null,
      type,
      category: category || null,
      title: title.trim(),
      body: postBody?.trim() ?? '',
      rating: rating ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 제품 연결
  if (product_ids?.length > 0) {
    await supabase.from('community_post_products').insert(
      product_ids.map((pid: string) => ({ post_id: post.id, product_id: pid }))
    )
  }

  // 비교투표 옵션
  if (type === 'compare' && compare_options?.length >= 2) {
    await supabase.from('community_compare_options').insert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      compare_options.map((opt: any, i: number) => ({
        post_id:    post.id,
        product_id: opt.product_id ?? null,
        label:      opt.label,
        image_url:  opt.image_url ?? null,
        sort_order: i,
      }))
    )
  }

  return NextResponse.json({ id: post.id }, { status: 201 })
}
