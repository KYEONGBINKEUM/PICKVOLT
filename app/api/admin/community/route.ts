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

// GET /api/admin/community — stats + settings
export async function GET(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const [
    { count: totalPosts },
    { count: totalComments },
    { count: todayPosts },
    { count: todayComments },
    { count: hiddenPosts },
    { count: pinnedPosts },
  ] = await Promise.all([
    svc.from('community_posts').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
    svc.from('community_comments').select('id', { count: 'exact', head: true }).eq('is_hidden', false),
    svc.from('community_posts').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    svc.from('community_comments').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    svc.from('community_posts').select('id', { count: 'exact', head: true }).eq('is_hidden', true),
    svc.from('community_posts').select('id', { count: 'exact', head: true }).eq('is_pinned', true),
  ])

  const settingsMap: Record<string, string> = {}
  try {
    const { data: settingsRows } = await svc.from('app_settings').select('key, value').in('key', [
      'community_points_per_post',
      'community_points_per_comment',
      'community_daily_max_post_points',
      'community_daily_max_comment_points',
      'ai_bot_post_points',
      'ai_bot_comment_points',
    ])
    for (const row of settingsRows ?? []) settingsMap[row.key] = row.value
  } catch { /* app_settings table may not exist yet */ }

  return NextResponse.json({
    stats: {
      totalPosts:     totalPosts ?? 0,
      totalComments:  totalComments ?? 0,
      todayPosts:     todayPosts ?? 0,
      todayComments:  todayComments ?? 0,
      hiddenPosts:    hiddenPosts ?? 0,
      pinnedPosts:    pinnedPosts ?? 0,
    },
    settings: {
      pointsPerPost:          parseInt(settingsMap['community_points_per_post']           ?? '5'),
      pointsPerComment:       parseInt(settingsMap['community_points_per_comment']        ?? '1'),
      dailyMaxPostPoints:     parseInt(settingsMap['community_daily_max_post_points']     ?? '0'),
      dailyMaxCommentPoints:  parseInt(settingsMap['community_daily_max_comment_points']  ?? '0'),
      aiBotPostPoints:        parseInt(settingsMap['ai_bot_post_points']                  ?? '50'),
      aiBotCommentPoints:     parseInt(settingsMap['ai_bot_comment_points']               ?? '20'),
    },
  })
}

// PATCH /api/admin/community — update settings
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const updates: { key: string; value: string }[] = []
  if (typeof body.pointsPerPost === 'number') {
    updates.push({ key: 'community_points_per_post', value: String(Math.max(0, Math.floor(body.pointsPerPost))) })
  }
  if (typeof body.pointsPerComment === 'number') {
    updates.push({ key: 'community_points_per_comment', value: String(Math.max(0, Math.floor(body.pointsPerComment))) })
  }
  if (typeof body.dailyMaxPostPoints === 'number') {
    updates.push({ key: 'community_daily_max_post_points', value: String(Math.max(0, Math.floor(body.dailyMaxPostPoints))) })
  }
  if (typeof body.dailyMaxCommentPoints === 'number') {
    updates.push({ key: 'community_daily_max_comment_points', value: String(Math.max(0, Math.floor(body.dailyMaxCommentPoints))) })
  }
  if (typeof body.aiBotPostPoints === 'number') {
    updates.push({ key: 'ai_bot_post_points', value: String(Math.max(0, Math.floor(body.aiBotPostPoints))) })
  }
  if (typeof body.aiBotCommentPoints === 'number') {
    updates.push({ key: 'ai_bot_comment_points', value: String(Math.max(0, Math.floor(body.aiBotCommentPoints))) })
  }

  if (updates.length === 0) return NextResponse.json({ ok: true })

  for (const u of updates) {
    await svc.from('app_settings')
      .upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
  }

  return NextResponse.json({ ok: true })
}
