import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { fingerprint } = await req.json()
  if (!fingerprint) return NextResponse.json({ error: 'fingerprint required' }, { status: 400 })

  const supabase = makeServiceClient()

  // 현재 리뷰 likes 조회
  const { data: review } = await supabase
    .from('reviews')
    .select('likes')
    .eq('id', id)
    .single()
  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from('review_likes')
    .select('fingerprint')
    .eq('review_id', id)
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (existing) {
    // 좋아요 취소
    await supabase.from('review_likes').delete()
      .eq('review_id', id).eq('fingerprint', fingerprint)
    const newLikes = Math.max(0, review.likes - 1)
    await supabase.from('reviews').update({ likes: newLikes }).eq('id', id)
    return NextResponse.json({ liked: false, likes: newLikes })
  } else {
    // 좋아요 추가
    await supabase.from('review_likes').insert({ review_id: id, fingerprint })
    const newLikes = review.likes + 1
    await supabase.from('reviews').update({ likes: newLikes }).eq('id', id)
    return NextResponse.json({ liked: true, likes: newLikes })
  }
}
