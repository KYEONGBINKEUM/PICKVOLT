import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const email = (user.email ?? '').toLowerCase()
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null
  return email
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const q = (searchParams.get('q') ?? '').trim().toLowerCase()
    const perPage = 50

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { data, error } = await svc.auth.admin.listUsers({ page, perPage })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let users = data.users

    // 이메일 검색 (서버 측 필터)
    if (q) {
      users = users.filter((u) => (u.email ?? '').toLowerCase().includes(q))
    }

    const userIds = users.map((u) => u.id)

    // 비교 횟수
    const compMap: Record<string, number> = {}
    if (userIds.length > 0) {
      const { data: compRows } = await svc
        .from('comparison_history')
        .select('user_id')
        .in('user_id', userIds)
      for (const row of compRows ?? []) {
        compMap[row.user_id] = (compMap[row.user_id] ?? 0) + 1
      }
    }

    // 구독 플랜
    const planMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: subRows } = await svc
        .from('subscriptions')
        .select('user_id, status')
        .in('user_id', userIds)
      for (const row of subRows ?? []) {
        planMap[row.user_id] = row.status
      }
    }

    // 커뮤니티 포스트 수
    const postsMap: Record<string, number> = {}
    if (userIds.length > 0) {
      const { data: postRows } = await svc
        .from('community_posts')
        .select('user_id')
        .in('user_id', userIds)
      for (const row of postRows ?? []) {
        postsMap[row.user_id] = (postsMap[row.user_id] ?? 0) + 1
      }
    }

    // 커뮤니티 댓글 수
    const commentsMap: Record<string, number> = {}
    if (userIds.length > 0) {
      const { data: commentRows } = await svc
        .from('community_comments')
        .select('user_id')
        .in('user_id', userIds)
      for (const row of commentRows ?? []) {
        commentsMap[row.user_id] = (commentsMap[row.user_id] ?? 0) + 1
      }
    }

    const enriched = users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      comparisons: compMap[u.id] ?? 0,
      plan: planMap[u.id] ?? 'free',
      provider: (u.app_metadata?.provider as string) ?? 'email',
      posts: postsMap[u.id] ?? 0,
      comments: commentsMap[u.id] ?? 0,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = (data as any).total ?? data.users.length

    return NextResponse.json({ users: enriched, total, page })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('admin/users error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/admin/users  →  유저 플랜 변경
export async function PATCH(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req)
    if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

    const { userId, plan } = await req.json()
    if (!userId || !['free', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'invalid params' }, { status: 400 })
    }

    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { error } = await svc
      .from('subscriptions')
      .upsert({ user_id: userId, status: plan }, { onConflict: 'user_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
