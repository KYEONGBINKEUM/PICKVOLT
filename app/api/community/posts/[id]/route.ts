import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await makeAnonClient().auth.getUser(token)
  return user ?? null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  let userId: string | null = null
  if (token) {
    const { data: { user } } = await makeAnonClient().auth.getUser(token)
    userId = user?.id ?? null
  }

  const supabase = makeServiceClient()

  // 조회수 증가
  const { error: rpcErr } = await supabase.rpc('increment_view', { post_id: id })
  if (rpcErr) {
    const { data: cur } = await supabase.from('community_posts').select('view_count').eq('id', id).single()
    if (cur) await supabase.from('community_posts').update({ view_count: (cur.view_count ?? 0) + 1 }).eq('id', id)
  }

  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      id, type, category, title, body, rating, upvotes, downvotes, comment_count, view_count,
      is_pinned, created_at, updated_at,
      user_id, user_display_name, user_avatar_url,
      community_post_products ( product_id, products ( id, name, brand, image_url, category ) ),
      community_compare_options ( id, label, image_url, vote_count, sort_order, product_id, products ( id, name, image_url ) )
    `)
    .eq('id', id)
    .single()

  if (error || !post) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let my_vote = false
  let my_downvote = false
  let my_compare_option: string | null = null

  if (userId) {
    const [{ data: pv }, { data: dv }, { data: cv }] = await Promise.all([
      supabase.from('community_post_votes').select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('community_post_downvotes').select('post_id').eq('post_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('community_compare_votes').select('option_id').eq('post_id', id).eq('user_id', userId).maybeSingle(),
    ])
    my_vote = !!pv
    my_downvote = !!dv
    my_compare_option = cv?.option_id ?? null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = ((post as any).community_compare_options ?? []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  return NextResponse.json({ ...post, community_compare_options: options, my_vote, my_downvote, my_compare_option })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data: existing } = await supabase.from('community_posts').select('user_id').eq('id', id).single()
  if (!existing || existing.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['title', 'body', 'rating', 'category']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) if (k in body) updates[k] = body[k]

  const { data, error } = await supabase.from('community_posts').update(updates).eq('id', id).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data: existing } = await supabase.from('community_posts').select('user_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const isAdmin = ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
  if (existing.user_id !== user.id && !isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { error } = await supabase.from('community_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
