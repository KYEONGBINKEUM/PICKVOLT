import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/events — upcoming approved tech events, public
export async function GET(req: Request) {
  const supabase = makeService()
  const today = new Date().toISOString().split('T')[0]
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10)

  const { data, error } = await supabase
    .from('tech_events')
    .select('id, name, organizer, event_date, end_date, location, url, description')
    .eq('is_approved', true)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(Math.min(limit, 200))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ events: data ?? [] })
}
