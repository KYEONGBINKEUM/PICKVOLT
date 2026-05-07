import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function svc() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
function anon() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) }

async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await anon().auth.getUser(token)
  return user ?? null
}

// GET /api/clans/[slug]
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser(req)
  const db = svc()

  const { data: clan, error } = await db
    .from('clans')
    .select('id, slug, name, description, avatar_url, banner_url, join_type, is_private, member_count, rules, created_at, owner_id')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !clan) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let my_membership = null
  if (user) {
    const { data: m } = await db
      .from('clan_members')
      .select('role, status')
      .eq('clan_id', clan.id)
      .eq('user_id', user.id)
      .maybeSingle()
    my_membership = m ?? null
  }

  return NextResponse.json({ clan: { ...clan, my_membership } })
}

// PATCH /api/clans/[slug]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = svc()
  const { data: clan } = await db.from('clans').select('id, owner_id').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Only owner or mod can edit
  const { data: membership } = await db.from('clan_members').select('role').eq('clan_id', clan.id).eq('user_id', user.id).maybeSingle()
  if (!membership || !['owner', 'moderator'].includes(membership.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)        updates.name        = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.avatar_url !== undefined)  updates.avatar_url  = body.avatar_url || null
  if (body.banner_url !== undefined)  updates.banner_url  = body.banner_url || null
  if (body.rules !== undefined)       updates.rules       = body.rules
  // Only owner can change these
  if (clan.owner_id === user.id) {
    if (body.join_type !== undefined)  updates.join_type  = body.join_type
    if (body.is_private !== undefined) updates.is_private = body.is_private
  }

  const { error } = await db.from('clans').update(updates).eq('id', clan.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/clans/[slug]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = svc()
  const { data: clan } = await db.from('clans').select('id, owner_id').eq('slug', slug).maybeSingle()
  if (!clan) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (clan.owner_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  await db.from('clans').delete().eq('id', clan.id)
  return NextResponse.json({ ok: true })
}
