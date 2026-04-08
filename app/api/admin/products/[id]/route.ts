import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const email = (user.email ?? '').toLowerCase()
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null
  return email
}

// PATCH: 기본 정보 + 스펙 upsert
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Basic product fields
  const allowedProduct = ['name', 'brand', 'category', 'image_url', 'price_usd', 'source_url', 'scrape_status', 'name_translations', 'is_visible']
  const productUpdates: Record<string, unknown> = {}
  for (const key of allowedProduct) {
    if (key in body) productUpdates[key] = body[key]
  }

  const supabase = makeServiceClient()
  const errors: string[] = []

  if (Object.keys(productUpdates).length > 0) {
    const { error } = await supabase
      .from('products')
      .update(productUpdates)
      .eq('id', id)
    if (error) errors.push(`products: ${error.message}`)
  }

  // Spec tables upsert
  const specTables = ['specs_common', 'specs_laptop', 'specs_smartphone', 'specs_tablet', 'specs_smartwatch'] as const
  for (const tableName of specTables) {
    const specData = body[tableName]
    if (specData && typeof specData === 'object' && Object.keys(specData).length > 0) {
      const { error } = await supabase
        .from(tableName)
        .upsert({ product_id: id, ...specData }, { onConflict: 'product_id' })
      if (error) errors.push(`${tableName}: ${error.message}`)
    }
  }

  // CPU 벤치마크 점수 업데이트 (cpus 테이블)
  if (body.cpu_scores && typeof body.cpu_scores === 'object') {
    const cpuId = body.specs_common?.cpu_id ?? body.cpu_id
    if (cpuId) {
      const allowed = ['relative_score', 'gb6_single', 'gb6_multi', 'score_source']
      const cpuUpdates: Record<string, unknown> = {}
      for (const key of allowed) {
        if (key in body.cpu_scores) cpuUpdates[key] = body.cpu_scores[key]
      }
      if (Object.keys(cpuUpdates).length > 0) {
        const { error } = await supabase
          .from('cpus')
          .update(cpuUpdates)
          .eq('id', cpuId)
        if (error) errors.push(`cpus: ${error.message}`)
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PUT: 이미지 파일 직접 업로드 → Supabase Storage
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const supabase = makeServiceClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `products/${id}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  await supabase.storage.from('product-images').remove([path])

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
  await supabase.from('products').update({ image_url: publicUrl }).eq('id', id)

  return NextResponse.json({ ok: true, image_url: publicUrl })
}

// DELETE: 제품 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = makeServiceClient()

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
