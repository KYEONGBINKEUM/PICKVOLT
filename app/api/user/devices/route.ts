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

// GET /api/user/devices — 내 기기 목록 (product 정보 포함)
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const sb = makeServiceClient()
  const { data, error } = await sb
    .from('user_devices')
    .select('id, product_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data || data.length === 0) return NextResponse.json({ devices: [] })

  // product 정보 조인
  const productIds = data.map(d => d.product_id)
  const { data: products } = await sb
    .from('products')
    .select('id, name, brand, category, image_url')
    .in('id', productIds)

  const productMap = new Map((products ?? []).map(p => [p.id, p]))

  const devices = data.map(d => ({
    id: d.id,
    product_id: d.product_id,
    created_at: d.created_at,
    product: productMap.get(d.product_id) ?? null,
  }))

  return NextResponse.json({ devices })
}

// POST /api/user/devices — 기기 추가
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { product_id } = await req.json()
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const sb = makeServiceClient()
  const { data, error } = await sb
    .from('user_devices')
    .insert({ user_id: user.id, product_id })
    .select('id, product_id, created_at')
    .single()

  if (error) {
    // unique 충돌 = 이미 등록됨
    if (error.code === '23505') return NextResponse.json({ error: 'already_added' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ device: data })
}

// DELETE /api/user/devices?product_id=xxx — 기기 제거
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const product_id = new URL(req.url).searchParams.get('product_id')
  if (!product_id) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const sb = makeServiceClient()
  const { error } = await sb
    .from('user_devices')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', product_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
