import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// POST /api/admin/reports/action
// body: { report_id, action: 'delete_content' | 'suspend_user' | 'ban_user' | 'unban_user', suspend_days?: number }
export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { report_id, action, suspend_days } = await req.json()
  if (!report_id || !action) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // 신고 정보 조회
  const { data: report } = await svc
    .from('community_reports')
    .select('target_type, target_id, reporter_id')
    .eq('id', report_id)
    .maybeSingle()

  if (!report) return NextResponse.json({ error: 'report not found' }, { status: 404 })

  if (action === 'delete_content') {
    if (report.target_type === 'post') {
      await svc.from('community_posts').delete().eq('id', report.target_id)
    } else if (report.target_type === 'comment') {
      await svc.from('community_comments').delete().eq('id', report.target_id)
    } else if (report.target_type === 'clan') {
      await svc.from('clans').delete().eq('id', report.target_id)
    }
    // 신고 상태를 reviewed로
    await svc.from('community_reports').update({ status: 'reviewed' }).eq('id', report_id)
    return NextResponse.json({ ok: true })
  }

  // 대상 유저 조회
  let targetUserId: string | null = null
  if (report.target_type === 'post') {
    const { data } = await svc.from('community_posts').select('user_id').eq('id', report.target_id).maybeSingle()
    targetUserId = data?.user_id ?? null
  } else if (report.target_type === 'comment') {
    const { data } = await svc.from('community_comments').select('user_id').eq('id', report.target_id).maybeSingle()
    targetUserId = data?.user_id ?? null
  } else if (report.target_type === 'clan') {
    const { data } = await svc.from('clans').select('owner_id').eq('id', report.target_id).maybeSingle()
    targetUserId = data?.owner_id ?? null
  }

  if (!targetUserId) return NextResponse.json({ error: 'target user not found' }, { status: 404 })

  if (action === 'suspend_user') {
    const days = Math.max(1, Math.min(365, suspend_days ?? 7))
    const bannedUntil = new Date(Date.now() + days * 86400000).toISOString()
    await svc.from('profiles').update({ is_banned: false, banned_until: bannedUntil }).eq('user_id', targetUserId)
    await svc.from('community_reports').update({ status: 'reviewed' }).eq('id', report_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'ban_user') {
    await svc.from('profiles').update({ is_banned: true, banned_until: null }).eq('user_id', targetUserId)
    await svc.from('community_reports').update({ status: 'reviewed' }).eq('id', report_id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'unban_user') {
    await svc.from('profiles').update({ is_banned: false, banned_until: null }).eq('user_id', targetUserId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
