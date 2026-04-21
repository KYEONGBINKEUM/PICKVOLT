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

// POST: { option_id } — 투표 또는 변경. 이미 같은 옵션이면 취소
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { option_id } = await req.json()
  if (!option_id) return NextResponse.json({ error: 'option_id required' }, { status: 400 })

  const supabase = makeServiceClient()

  // 옵션이 이 게시물 소속인지 확인
  const { data: opt } = await supabase
    .from('community_compare_options')
    .select('id')
    .eq('id', option_id)
    .eq('post_id', id)
    .maybeSingle()
  if (!opt) return NextResponse.json({ error: 'invalid option' }, { status: 400 })

  // 기존 투표 확인
  const { data: existing } = await supabase
    .from('community_compare_votes')
    .select('option_id')
    .eq('post_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.option_id === option_id) {
      // 같은 옵션 → 취소
      await supabase.from('community_compare_votes').delete().eq('post_id', id).eq('user_id', user.id)
    } else {
      // 다른 옵션 → 변경 (삭제 후 재입력, 트리거가 카운터 처리)
      await supabase.from('community_compare_votes').delete().eq('post_id', id).eq('user_id', user.id)
      await supabase.from('community_compare_votes').insert({ post_id: id, option_id, user_id: user.id })
    }
  } else {
    await supabase.from('community_compare_votes').insert({ post_id: id, option_id, user_id: user.id })
  }

  // 최신 vote_count 반환
  const { data: options } = await supabase
    .from('community_compare_options')
    .select('id, vote_count')
    .eq('post_id', id)

  const my_option = (existing?.option_id === option_id) ? null : option_id
  return NextResponse.json({ options: options ?? [], my_option })
}
