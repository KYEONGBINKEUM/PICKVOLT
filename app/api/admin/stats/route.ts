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

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { count: totalProducts },
    { count: noImage },
    { count: scrapeOk },
    { count: scrapePending },
    { count: scrapeFailed },
    { count: totalComparisons },
    { count: todayComparisons },
    usersResult,
  ] = await Promise.all([
    svc.from('products').select('id', { count: 'exact', head: true }),
    svc.from('products').select('id', { count: 'exact', head: true }).is('image_url', null),
    svc.from('products').select('id', { count: 'exact', head: true }).eq('scrape_status', 'ok'),
    svc.from('products').select('id', { count: 'exact', head: true }).eq('scrape_status', 'pending'),
    svc.from('products').select('id', { count: 'exact', head: true }).in('scrape_status', ['failed', 'partial']),
    svc.from('comparison_history').select('id', { count: 'exact', head: true }),
    svc.from('comparison_history').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    svc.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalUsers = (usersResult.data as any)?.total ?? 0

  // Recent 5 comparisons
  const { data: recent } = await svc
    .from('comparison_history')
    .select('id, title, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    totalProducts: totalProducts ?? 0,
    noImage: noImage ?? 0,
    scrapeOk: scrapeOk ?? 0,
    scrapePending: scrapePending ?? 0,
    scrapeFailed: scrapeFailed ?? 0,
    totalComparisons: totalComparisons ?? 0,
    todayComparisons: todayComparisons ?? 0,
    totalUsers,
    recentComparisons: recent ?? [],
  })
}
