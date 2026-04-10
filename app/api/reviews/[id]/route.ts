import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const isAdmin = ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())

  const { id } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: review } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (!isAdmin && review.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const { content, rating } = await req.json()
  const trimmed = (content ?? '').trim()
  if (trimmed.length < 10) return NextResponse.json({ error: '10자 이상 입력해주세요' }, { status: 400 })
  if (trimmed.length > 500) return NextResponse.json({ error: '500자 이하로 입력해주세요' }, { status: 400 })
  const ratingVal = typeof rating === 'number' && rating >= 1 && rating <= 10 ? rating : undefined

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: review } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (review.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const updatePayload: Record<string, unknown> = { content: trimmed }
  if (ratingVal !== undefined) updatePayload.rating = ratingVal

  const { data, error } = await supabase
    .from('reviews')
    .update(updatePayload)
    .eq('id', id)
    .select('id, user_id, user_display_name, content, rating, likes, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}
