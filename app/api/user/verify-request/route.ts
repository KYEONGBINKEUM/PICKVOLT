import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// GET /api/user/verify-request — check current user's request status
export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data } = await makeService()
    .from('verify_requests')
    .select('id, status, category, created_at, admin_note')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ request: data ?? null })
}

// POST /api/user/verify-request — submit a new request
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeService()

  // Check for existing pending/approved request
  const { data: existing } = await supabase
    .from('verify_requests')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'pending') {
      return NextResponse.json({ error: 'already_pending' }, { status: 400 })
    }
    if (existing.status === 'approved') {
      return NextResponse.json({ error: 'already_approved' }, { status: 400 })
    }
    // Rejected: check 30-day cooldown
    const daysSince = (Date.now() - new Date(existing.created_at).getTime()) / 86400000
    if (daysSince < 30) {
      return NextResponse.json({ error: 'cooldown', days_left: Math.ceil(30 - daysSince) }, { status: 400 })
    }
  }

  const body = await req.json()
  const { category, reason, website, social_links } = body
  if (!category || !reason?.trim()) {
    return NextResponse.json({ error: 'category and reason required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('verify_requests').insert({
    user_id: user.id,
    nickname: profile?.nickname ?? user.email?.split('@')[0] ?? 'user',
    email: user.email,
    category,
    reason: reason.trim(),
    website: website?.trim() || null,
    social_links: social_links?.trim() || null,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true }, { status: 201 })
}
