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

// GET /api/clans?q=search&my=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q  = searchParams.get('q') ?? ''
  const my = searchParams.get('my') === '1'

  const user = my ? await getUser(req) : null

  const db = svc()
  let query = db.from('clans').select('id, slug, name, description, avatar_url, banner_url, join_type, is_private, member_count, created_at, owner_id')

  if (q) query = query.ilike('name', `%${q}%`)

  if (my && user) {
    const { data: memberships } = await db
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
    const ids = (memberships ?? []).map((m: { clan_id: string }) => m.clan_id)
    if (ids.length === 0) return NextResponse.json({ clans: [] })
    query = query.in('id', ids)
  }

  query = query.order('member_count', { ascending: false }).limit(50)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // membership status for logged-in user
  const userId = user?.id ?? null
  if (userId && data && data.length > 0) {
    const { data: memberships } = await db
      .from('clan_members')
      .select('clan_id, role, status')
      .eq('user_id', userId)
      .in('clan_id', data.map((c: { id: string }) => c.id))
    const memberMap = Object.fromEntries((memberships ?? []).map((m: { clan_id: string; role: string; status: string }) => [m.clan_id, m]))
    return NextResponse.json({ clans: data.map((c: { id: string }) => ({ ...c, my_membership: memberMap[c.id] ?? null })) })
  }

  return NextResponse.json({ clans: (data ?? []).map((c: object) => ({ ...c, my_membership: null })) })
}

// POST /api/clans
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name, slug, description, join_type, is_private } = await req.json()
  if (!name?.trim() || !slug?.trim()) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (cleanSlug.length < 2) return NextResponse.json({ error: 'slug too short' }, { status: 400 })

  const db = svc()

  // Check slug uniqueness
  const { data: existing } = await db.from('clans').select('id').eq('slug', cleanSlug).maybeSingle()
  if (existing) return NextResponse.json({ error: 'slug_taken' }, { status: 409 })

  const { data: profile } = await db.from('profiles').select('nickname').eq('user_id', user.id).maybeSingle()

  const { data: clan, error } = await db.from('clans').insert({
    name: name.trim(),
    slug: cleanSlug,
    description: description?.trim() || null,
    owner_id: user.id,
    join_type: join_type ?? 'auto',
    is_private: is_private ?? false,
    member_count: 1,
  }).select('id, slug').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-add owner as member
  await db.from('clan_members').insert({
    clan_id: clan.id,
    user_id: user.id,
    role: 'owner',
    status: 'approved',
    display_name: profile?.nickname ?? user.email?.split('@')[0] ?? 'user',
  })

  return NextResponse.json({ slug: clan.slug }, { status: 201 })
}
