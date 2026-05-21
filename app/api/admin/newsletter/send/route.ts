import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

// Admin-authenticated newsletter trigger
// Reuses the same logic as the cron but verifies via Supabase token
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Delegate to the cron handler using the service key as auth
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.pickvolt.com'
  const res = await fetch(`${base}/api/cron/newsletter`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
