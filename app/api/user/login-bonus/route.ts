import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // claim_daily_bonus() RPC: 오늘 미수령 시 +5, 이미 수령 시 no-op
  const { data, error } = await supabase.rpc('claim_daily_bonus')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // RPC returns array of rows [{claimed, new_points}]
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    claimed: row?.claimed ?? false,
    points: row?.new_points ?? 0,
  })
}
