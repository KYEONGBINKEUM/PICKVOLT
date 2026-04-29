import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  const user = token
    ? (await makeAnonClient().auth.getUser(token)).data.user
    : null

  const body = await req.json()
  const { category, product_name, brand } = body
  if (!category?.trim() || !product_name?.trim() || !brand?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const svc = makeServiceClient()
  const { error } = await svc.from('product_add_requests').insert({
    user_id: user?.id ?? null,
    category: category.trim(),
    product_name: product_name.trim(),
    brand: brand.trim(),
    photo_url: body.photo_url ?? null,
    cpu: body.cpu?.trim() ?? null,
    gpu: body.gpu?.trim() ?? null,
    ram: body.ram?.trim() ?? null,
    storage: body.storage?.trim() ?? null,
    os: body.os?.trim() ?? null,
    wifi: body.wifi?.trim() ?? null,
    bluetooth: body.bluetooth?.trim() ?? null,
    launch_year: body.launch_year ? parseInt(body.launch_year) : null,
    extra_notes: body.extra_notes?.trim() ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const svc = makeServiceClient()
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'pending'
  const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0'))
  const size = 50

  const { data, error } = await svc
    .from('product_add_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(page * size, page * size + size - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnonClient().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id, status } = await req.json()
  if (!['pending', 'added', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const svc = makeServiceClient()
  const { error } = await svc.from('product_add_requests').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
