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
  const { data: clan } = await db.from('clans').select('id, owner_id').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (clan.owner_id === user.id) return NextResponse.json({ error: 'owner_cannot_leave' }, { status: 400 })

  const { data: m } = await db.from('clan_members').select('status').eq('clan_id', clan.id).eq('user_id', user.id).maybeSingle()
  if (!m) return NextResponse.json({ error: 'not_member' }, { status: 400 })

  await db.from('clan_members').delete().eq('clan_id', clan.id).eq('user_id', user.id)

  if (m.status === 'approved') {
    const { data: c } = await db.from('clans').select('member_count').eq('id', clan.id).single()
    if (c) await db.from('clans').update({ member_count: Math.max(0, (c.member_count ?? 1) - 1) }).eq('id', clan.id)
  }

  return NextResponse.json({ ok: true })
}
