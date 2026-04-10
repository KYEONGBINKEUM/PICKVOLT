import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, user_id, user_display_name, content, rating, likes, created_at')
    .eq('product_id', productId)
    .order('likes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { reviews: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { product_id, content, rating } = await req.json()
  if (!product_id || !content?.trim()) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const trimmed = content.trim()
  if (trimmed.length < 10) return NextResponse.json({ error: '10자 이상 입력해주세요' }, { status: 400 })
  if (trimmed.length > 500) return NextResponse.json({ error: '500자 이하로 입력해주세요' }, { status: 400 })
  const ratingVal = typeof rating === 'number' && rating >= 1 && rating <= 10 ? rating : 5

  const supabase = makeServiceClient()

  // 프로필에서 닉네임 조회 (없으면 이메일 앞부분 fallback)
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', user.id)
    .maybeSingle()
  const displayName = profile?.nickname ?? user.email?.split('@')[0] ?? 'user'

  const { data, error } = await supabase
    .from('reviews')
    .insert({ product_id, user_id: user.id, user_display_name: displayName, content: trimmed, rating: ratingVal, likes: 0 })
    .select('id, user_id, user_display_name, content, rating, likes, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 리뷰를 작성했습니다' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ review: data })
}
