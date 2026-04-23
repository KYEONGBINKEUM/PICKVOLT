import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  return user ?? null
}

const VALID_REASONS = ['spam', 'hate', 'sexual', 'violence', 'privacy', 'false_info', 'other']
const VALID_TYPES   = ['post', 'comment']

// POST: 신고 제출
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { target_type, target_id, reason, detail } = await req.json()

  if (!VALID_TYPES.includes(target_type))   return NextResponse.json({ error: 'invalid target_type' }, { status: 400 })
  if (!VALID_REASONS.includes(reason))       return NextResponse.json({ error: 'invalid reason' }, { status: 400 })
  if (!target_id)                            return NextResponse.json({ error: 'missing target_id' }, { status: 400 })

  const supabase = makeServiceClient()

  // 중복 신고 방지
  const { data: dup } = await supabase
    .from('community_reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .maybeSingle()
  if (dup) return NextResponse.json({ error: 'already_reported' }, { status: 409 })

  const { error } = await supabase.from('community_reports').insert({
    reporter_id: user.id,
    target_type,
    target_id,
    reason,
    detail: detail?.trim() ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

// GET: 관리자용 신고 목록
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = makeServiceClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? ''
  const page   = Math.max(0, parseInt(url.searchParams.get('page') ?? '0'))
  const size   = 50

  let query = supabase
    .from('community_reports')
    .select('id, target_type, target_id, reason, detail, status, created_at, reporter_id')
    .order('created_at', { ascending: false })
    .range(page * size, page * size + size - 1)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

// PATCH: 신고 상태 업데이트 (관리자)
export async function PATCH(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id, status } = await req.json()
  if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const supabase = makeServiceClient()
  const { error } = await supabase.from('community_reports').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
