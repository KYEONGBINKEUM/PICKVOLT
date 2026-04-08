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
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const perPage = 50

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data, count, error } = await svc
    .from('comparison_history')
    .select('id, title, user_id, created_at, pinned', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * perPage, (page + 1) * perPage - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve user emails for unique user_ids
  const uniqueUserIds = Array.from(new Set((data ?? []).map((c) => c.user_id).filter(Boolean)))
  const emailMap: Record<string, string> = {}

  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      const { data: u } = await svc.auth.admin.getUserById(uid)
      if (u?.user) emailMap[uid] = u.user.email ?? uid.slice(0, 8)
    })
  )

  const enriched = (data ?? []).map((c) => ({
    ...c,
    user_email: emailMap[c.user_id] ?? c.user_id?.slice(0, 8) ?? '—',
  }))

  return NextResponse.json({ comparisons: enriched, total: count ?? 0, page })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('admin/comparisons error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
