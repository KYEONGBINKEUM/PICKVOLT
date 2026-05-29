import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/events — upcoming approved tech events, public
export async function GET() {
  const supabase = makeAnon()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('tech_events')
    .select('id, name, organizer, event_date, end_date, location, url, description')
    .eq('is_approved', true)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}
