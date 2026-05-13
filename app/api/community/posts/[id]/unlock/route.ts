import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase.rpc('unlock_post', {
    p_post_id: id,
    p_viewer_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { success: boolean; error?: string; points_spent?: number }
  if (!result.success) {
    const status = result.error === 'insufficient_points' ? 402
      : result.error === 'already_unlocked' ? 409
      : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ points_spent: result.points_spent })
}
