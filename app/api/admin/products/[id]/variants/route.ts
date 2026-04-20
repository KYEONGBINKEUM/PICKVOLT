import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  const email = (user.email ?? '').toLowerCase()
  return ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)
}

// GET: 제품의 variants 목록
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = makeServiceClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, variant_name, cpu_name, cpu_id, gpu_name, gpu_id, ram_gb, storage_gb, price_usd, source_url, amazon_url, sort_order, created_at')
    .eq('product_id', id)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variants: data ?? [] })
}

// POST: variant 생성
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id:   id,
      variant_name: body.variant_name ?? '',
      cpu_name:     body.cpu_name     ?? null,
      cpu_id:       body.cpu_id       ?? null,
      gpu_name:     body.gpu_name     ?? null,
      gpu_id:       body.gpu_id       ?? null,
      ram_gb:       body.ram_gb       != null ? String(body.ram_gb) : null,
      storage_gb:   body.storage_gb   != null ? String(body.storage_gb) : null,
      price_usd:    body.price_usd    != null ? parseFloat(String(body.price_usd)) : null,
      source_url:   body.source_url   ?? null,
      amazon_url:   body.amazon_url   ?? null,
      sort_order:   body.sort_order   ?? 0,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

// PUT: variant 수정 (body에 variantId 포함)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { variantId, ...rest } = body

  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if ('variant_name' in rest) updates.variant_name = rest.variant_name
  if ('cpu_name'     in rest) updates.cpu_name     = rest.cpu_name     ?? null
  if ('cpu_id'       in rest) updates.cpu_id       = rest.cpu_id       ?? null
  if ('gpu_name'     in rest) updates.gpu_name     = rest.gpu_name     ?? null
  if ('gpu_id'       in rest) updates.gpu_id       = rest.gpu_id       ?? null
  if ('ram_gb'       in rest) updates.ram_gb       = rest.ram_gb       != null ? String(rest.ram_gb) : null
  if ('storage_gb'   in rest) updates.storage_gb   = rest.storage_gb   != null ? String(rest.storage_gb) : null
  if ('price_usd'    in rest) updates.price_usd    = rest.price_usd    != null ? parseFloat(String(rest.price_usd)) : null
  if ('source_url'   in rest) updates.source_url   = rest.source_url   ?? null
  if ('amazon_url'   in rest) updates.amazon_url   = rest.amazon_url   ?? null
  if ('sort_order'   in rest) updates.sort_order   = rest.sort_order

  const supabase = makeServiceClient()
  const { error } = await supabase
    .from('product_variants')
    .update(updates)
    .eq('id', variantId)
    .eq('product_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: variant 삭제 (?variantId=xxx)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const variantId = new URL(req.url).searchParams.get('variantId')
  if (!variantId) return NextResponse.json({ error: 'variantId required' }, { status: 400 })

  const supabase = makeServiceClient()
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', variantId)
    .eq('product_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
