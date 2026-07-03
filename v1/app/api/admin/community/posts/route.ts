import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return null
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

// GET /api/admin/community/posts?q=&type=&hidden=&page=1
export async function GET(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q      = searchParams.get('q') ?? ''
  const type   = searchParams.get('type') ?? ''
  const hidden = searchParams.get('hidden') ?? '' // 'true'|'false'|''
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit  = 30
  const offset = (page - 1) * limit

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  let query = svc
    .from('community_posts')
    .select('id, type, title, user_display_name, upvotes, comment_count, view_count, is_hidden, is_pinned, created_at, clan_id, clans(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (type) query = query.eq('type', type)
  if (hidden === 'true')  query = query.eq('is_hidden', true)
  if (hidden === 'false') query = query.eq('is_hidden', false)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: data ?? [], total: count ?? 0 })
}

// PATCH /api/admin/community/posts — hide/pin/delete
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { post_id, action } = await req.json()
  if (!post_id || !action) return NextResponse.json({ error: 'post_id and action required' }, { status: 400 })

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  if (action === 'hide') {
    await svc.from('community_posts').update({ is_hidden: true }).eq('id', post_id)
  } else if (action === 'unhide') {
    await svc.from('community_posts').update({ is_hidden: false }).eq('id', post_id)
  } else if (action === 'pin') {
    await svc.from('community_posts').update({ is_pinned: true }).eq('id', post_id)
  } else if (action === 'unpin') {
    await svc.from('community_posts').update({ is_pinned: false }).eq('id', post_id)
  } else if (action === 'delete') {
    await svc.from('community_posts').delete().eq('id', post_id)
  } else {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
