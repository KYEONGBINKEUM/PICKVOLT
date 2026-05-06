import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// POST /api/user/[userId]/subscribe — toggle subscribe/unsubscribe
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId: channelId } = params
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (user.id === channelId) return NextResponse.json({ error: 'cannot subscribe to self' }, { status: 400 })

  const supabase = makeService()

  // Check existing subscription
  const { data: existing } = await supabase
    .from('channel_subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('channel_id', channelId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('channel_subscriptions')
      .delete()
      .eq('subscriber_id', user.id)
      .eq('channel_id', channelId)

    const { count } = await supabase
      .from('channel_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)

    return NextResponse.json({ subscribed: false, subscriber_count: count ?? 0 })
  } else {
    await supabase
      .from('channel_subscriptions')
      .insert({ subscriber_id: user.id, channel_id: channelId })

    const { count } = await supabase
      .from('channel_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', channelId)

    return NextResponse.json({ subscribed: true, subscriber_count: count ?? 0 })
  }
}
