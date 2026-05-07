import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function svc() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
function anon() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) }

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await anon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = svc()
  const { data: clan } = await db.from('clans').select('id, join_type').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const { data: existing } = await db.from('clan_members').select('status').eq('clan_id', clan.id).eq('user_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'already_member', status: existing.status }, { status: 409 })

  const { data: profile } = await db.from('profiles').select('nickname').eq('user_id', user.id).maybeSingle()
  const status = clan.join_type === 'auto' ? 'approved' : 'pending'

  await db.from('clan_members').insert({
    clan_id: clan.id,
    user_id: user.id,
    role: 'member',
    status,
    display_name: profile?.nickname ?? user.email?.split('@')[0] ?? 'user',
  })

  if (status === 'approved') {
    const { data: c } = await db.from('clans').select('member_count').eq('id', clan.id).single()
    if (c) await db.from('clans').update({ member_count: (c.member_count ?? 0) + 1 }).eq('id', clan.id)
  }

  return NextResponse.json({ status })
}
