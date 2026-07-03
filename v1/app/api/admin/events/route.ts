import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function makeAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

// GET /api/admin/events — all events (admin)
export async function GET(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = makeService()
  const { data, error } = await supabase
    .from('tech_events')
    .select('*')
    .order('event_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}

// POST /api/admin/events — create event
export async function POST(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, organizer, event_date, end_date, location, url, description, is_approved, is_recurring } = body

  if (!name || !event_date) {
    return NextResponse.json({ error: 'name and event_date are required' }, { status: 400 })
  }

  const supabase = makeService()
  const { data, error } = await supabase
    .from('tech_events')
    .insert({
      name,
      organizer: organizer ?? null,
      event_date,
      end_date: end_date ?? null,
      location: location ?? null,
      url: url ?? null,
      description: description ?? null,
      is_approved: is_approved ?? true,
      is_recurring: is_recurring ?? false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}

// PATCH /api/admin/events — update event by id
export async function PATCH(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const allowed = ['name', 'organizer', 'event_date', 'end_date', 'location', 'url', 'description', 'is_approved', 'is_recurring']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in fields) updates[key] = fields[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no valid fields to update' }, { status: 400 })
  }

  const supabase = makeService()
  const { error } = await supabase
    .from('tech_events')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/admin/events — delete event by id
export async function DELETE(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = makeService()
  const { error } = await supabase
    .from('tech_events')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
