import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function svc() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
function anon() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) }

async function getCallerMembership(db: ReturnType<typeof svc>, clanId: string, userId: string) {
  const { data } = await db.from('clan_members').select('role').eq('clan_id', clanId).eq('user_id', userId).maybeSingle()
  return data ?? null
}

// GET /api/clans/[slug]/members?status=approved|pending
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await anon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = svc()
  const { data: clan } = await db.from('clans').select('id').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const caller = await getCallerMembership(db, clan.id, user.id)
  if (!caller) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') ?? 'approved'

  const { data, error } = await db
    .from('clan_members')
    .select('user_id, role, status, joined_at, display_name, profiles ( avatar_url )')
    .eq('clan_id', clan.id)
    .eq('status', status)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

// PATCH /api/clans/[slug]/members — approve | kick | promote | demote
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await anon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = svc()
  const { data: clan } = await db.from('clans').select('id, owner_id').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const caller = await getCallerMembership(db, clan.id, user.id)
  if (!caller || !['owner', 'moderator'].includes(caller.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { target_user_id, action } = await req.json()
  if (!target_user_id || !action) return NextResponse.json({ error: 'target_user_id and action required' }, { status: 400 })

  const { data: target } = await db.from('clan_members').select('role, status').eq('clan_id', clan.id).eq('user_id', target_user_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'member not found' }, { status: 404 })

  // Prevent actions on owner
  if (target.role === 'owner') return NextResponse.json({ error: 'cannot_modify_owner' }, { status: 400 })
  // Mods can only approve/kick regular members
  if (caller.role === 'moderator' && target.role === 'moderator') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  if (action === 'approve') {
    await db.from('clan_members').update({ status: 'approved' }).eq('clan_id', clan.id).eq('user_id', target_user_id)
    const { data: c } = await db.from('clans').select('member_count').eq('id', clan.id).single()
    if (c) await db.from('clans').update({ member_count: (c.member_count ?? 0) + 1 }).eq('id', clan.id)
  } else if (action === 'kick') {
    await db.from('clan_members').delete().eq('clan_id', clan.id).eq('user_id', target_user_id)
    if (target.status === 'approved') {
      const { data: c } = await db.from('clans').select('member_count').eq('id', clan.id).single()
      if (c) await db.from('clans').update({ member_count: Math.max(0, (c.member_count ?? 1) - 1) }).eq('id', clan.id)
    }
  } else if (action === 'promote' && clan.owner_id === user.id) {
    await db.from('clan_members').update({ role: 'moderator' }).eq('clan_id', clan.id).eq('user_id', target_user_id)
  } else if (action === 'demote' && clan.owner_id === user.id) {
    await db.from('clan_members').update({ role: 'member' }).eq('clan_id', clan.id).eq('user_id', target_user_id)
  } else {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
