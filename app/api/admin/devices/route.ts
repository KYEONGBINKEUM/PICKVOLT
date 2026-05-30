import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return null
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

// GET /api/admin/devices — 전체 기기 등록 현황
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // user_devices + profiles + products 조인
  const { data: devices, error } = await sb
    .from('user_devices')
    .select('id, user_id, product_id, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!devices || devices.length === 0) return NextResponse.json({ rows: [] })

  // 유저 정보
  const userIds = Array.from(new Set(devices.map(d => d.user_id)))
  const { data: profiles } = await sb
    .from('profiles')
    .select('user_id, nickname')
    .in('user_id', userIds)

  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(
    (authUsers?.users ?? []).map(u => [u.id, u.email ?? null])
  )
  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.nickname]))

  // 제품 정보
  const productIds = Array.from(new Set(devices.map(d => d.product_id)))
  const { data: products } = await sb
    .from('products')
    .select('id, name, brand, category')
    .in('id', productIds)
  const productMap = new Map((products ?? []).map(p => [p.id, p]))

  const rows = devices.map(d => ({
    id: d.id,
    user_id: d.user_id,
    product_id: d.product_id,
    created_at: d.created_at,
    user_email: emailMap.get(d.user_id) ?? null,
    user_nickname: profileMap.get(d.user_id) ?? null,
    product_name: productMap.get(d.product_id)?.name ?? null,
    product_brand: productMap.get(d.product_id)?.brand ?? null,
    product_category: productMap.get(d.product_id)?.category ?? null,
  }))

  return NextResponse.json({ rows })
}
