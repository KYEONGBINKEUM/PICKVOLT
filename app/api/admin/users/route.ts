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
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const perPage = 50

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await svc.auth.admin.listUsers({ page, perPage })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const users = data.users
  const userIds = users.map((u) => u.id)

  // Comparison counts + subscriptions in parallel
  const [{ data: compRows }, { data: subs }] = await Promise.all([
    svc.from('comparison_history').select('user_id').in('user_id', userIds),
    svc.from('subscriptions').select('user_id, status').in('user_id', userIds),
  ])

  const compMap: Record<string, number> = {}
  for (const row of compRows ?? []) {
    compMap[row.user_id] = (compMap[row.user_id] ?? 0) + 1
  }
  const subMap: Record<string, string> = {}
  for (const s of subs ?? []) subMap[s.user_id] = s.status

  const enriched = users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    comparisons: compMap[u.id] ?? 0,
    plan: subMap[u.id] ?? 'free',
    provider: (u.app_metadata?.provider as string) ?? 'email',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (data as any).total ?? users.length

  return NextResponse.json({ users: enriched, total, page })
}
