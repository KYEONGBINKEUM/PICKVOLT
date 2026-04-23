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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { commentId } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data: existing } = await supabase
    .from('community_comment_votes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: existingDown } = await supabase
    .from('community_comment_downvotes').select('comment_id').eq('comment_id', commentId).eq('user_id', user.id).maybeSingle()

  if (existing) {
    await supabase.from('community_comment_votes').delete().eq('comment_id', commentId).eq('user_id', user.id)
    const { data } = await supabase.from('community_comments').select('upvotes, downvotes').eq('id', commentId).single()
    const newUp = Math.max(0, (data?.upvotes ?? 1) - 1)
    await supabase.from('community_comments').update({ upvotes: newUp }).eq('id', commentId)
    return NextResponse.json({ voted: false, upvotes: newUp, downvotes: data?.downvotes ?? 0, my_downvote: !!existingDown })
  }

  // 추천 추가 + 비추천 제거(있으면)
  await supabase.from('community_comment_votes').insert({ comment_id: commentId, user_id: user.id })
  if (existingDown) {
    await supabase.from('community_comment_downvotes').delete().eq('comment_id', commentId).eq('user_id', user.id)
  }
  const { data } = await supabase.from('community_comments').select('upvotes, downvotes').eq('id', commentId).single()
  const newUp = (data?.upvotes ?? 0) + 1
  await supabase.from('community_comments').update({ upvotes: newUp }).eq('id', commentId)
  return NextResponse.json({ voted: true, upvotes: newUp, downvotes: data?.downvotes ?? 0, my_downvote: false })
}
