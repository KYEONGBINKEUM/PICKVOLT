import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
async function getUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await anon.auth.getUser(token)
  return user ?? null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()

  const { data: existing } = await supabase
    .from('community_post_downvotes')
    .select('post_id')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('community_post_downvotes').delete().eq('post_id', id).eq('user_id', user.id)
    const { data } = await supabase.from('community_posts').select('downvotes').eq('id', id).single()
    const newCount = Math.max(0, (data?.downvotes ?? 1) - 1)
    await supabase.from('community_posts').update({ downvotes: newCount }).eq('id', id)
    return NextResponse.json({ voted: false, downvotes: newCount })
  }

  await supabase.from('community_post_downvotes').insert({ post_id: id, user_id: user.id })
  const { data } = await supabase.from('community_posts').select('downvotes').eq('id', id).single()
  const newCount = (data?.downvotes ?? 0) + 1
  await supabase.from('community_posts').update({ downvotes: newCount }).eq('id', id)
  return NextResponse.json({ voted: true, downvotes: newCount })
}
