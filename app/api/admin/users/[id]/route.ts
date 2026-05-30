import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return null
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

// GET /api/admin/users/[id] — 유저 상세 (프로필 + 최근 글/댓글)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [profileRes, postsRes, commentsRes, txRes] = await Promise.all([
    svc.from('profiles').select('user_id, nickname, avatar_url, points').eq('user_id', id).maybeSingle(),
    svc.from('community_posts')
      .select('id, title, type, upvotes, created_at, is_hidden')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    svc.from('community_comments')
      .select('id, body, post_id, upvotes, created_at, is_hidden')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    svc.from('point_transactions')
      .select('id, amount, type, description, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return NextResponse.json({
    profile: profileRes.data ?? null,
    posts: postsRes.data ?? [],
    comments: commentsRes.data ?? [],
    transactions: txRes.data ?? [],
  })
}

// PATCH /api/admin/users/[id] — 포인트 조정
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { amount, reason } = await req.json()
  if (typeof amount !== 'number' || amount === 0) {
    return NextResponse.json({ error: 'invalid amount' }, { status: 400 })
  }

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: profile } = await svc.from('profiles').select('points').eq('user_id', id).maybeSingle()
  const cur = (profile as { points?: number } | null)?.points ?? 0
  const next = Math.max(0, cur + amount)

  await svc.from('profiles').update({ points: next }).eq('user_id', id)
  await svc.from('point_transactions').insert({
    user_id: id,
    amount,
    reason: amount > 0 ? 'admin_grant' : 'admin_deduct',
  })

  return NextResponse.json({ ok: true, points: next })
}
