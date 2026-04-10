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
  if ('price_usd' in productUpdates && productUpdates.price_usd != null) {
    productUpdates.price_usd = parseFloat(String(productUpdates.price_usd))
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
    const specData = body[tableName] as Record<string, unknown> | undefined
    if (specData && typeof specData === 'object' && Object.keys(specData).length > 0) {
      // storage_gb, ram_gb는 text 컬럼 — 숫자로 들어와도 문자열로 강제 변환
      const safe = { ...specData }
      if ('storage_gb' in safe && safe.storage_gb != null) safe.storage_gb = String(safe.storage_gb)
      if ('ram_gb'     in safe && safe.ram_gb     != null) safe.ram_gb     = String(safe.ram_gb)
      const { error } = await supabase
        .from(tableName)
        .upsert({ product_id: id, ...safe }, { onConflict: 'product_id' })
      if (error) errors.push(`${tableName}: ${error.message}`)
    }
  }

  // CPU 벤치마크 점수 업데이트 (cpus 테이블)
  if (body.cpu_scores && typeof body.cpu_scores === 'object') {
    const cpuId = (body.specs_common as Record<string, unknown>)?.cpu_id ?? body.cpu_id
    if (cpuId) {
      const allowed = ['relative_score', 'gb6_single', 'gb6_multi', 'tdmark_score', 'antutu_score', 'cinebench_single', 'cinebench_multi', 'score_source']
      const cpuUpdates: Record<string, unknown> = {}
      for (const key of allowed) {
        if (key in (body.cpu_scores as Record<string, unknown>)) cpuUpdates[key] = (body.cpu_scores as Record<string, unknown>)[key]
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
  const ts = Date.now()
  const newPath = `products/${id}-${ts}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  // 기존 이미지 파일 삭제 (이름이 달라도 정리)
  const { data: existing } = await supabase.from('products').select('image_url').eq('id', id).single()
  if (existing?.image_url) {
    const oldPath = existing.image_url.split('/product-images/')[1]?.split('?')[0]
    if (oldPath) await supabase.storage.from('product-images').remove([oldPath])
  }

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(newPath, arrayBuffer, { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(newPath)
  await supabase.from('products').update({ image_url: publicUrl }).eq('id', id)

  return NextResponse.json({ ok: true, image_url: publicUrl })
}

// POST: 제품 복사 (is_visible = false 강제)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = makeServiceClient()

  // 원본 제품 조회
  const { data: original, error: fetchError } = await supabase
    .from('products')
    .select('name, brand, category, image_url, price_usd, source_url, scrape_status, name_translations')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    return NextResponse.json({ error: fetchError?.message ?? 'not found' }, { status: 404 })
  }

  // 새 제품 생성 (is_visible 항상 false)
  const { data: newProduct, error: insertError } = await supabase
    .from('products')
    .insert({
      name: `${original.name} (복사본)`,
      brand: original.brand,
      category: original.category,
      image_url: original.image_url,
      price_usd: original.price_usd,
      source_url: original.source_url,
      scrape_status: original.scrape_status,
      name_translations: original.name_translations,
      is_visible: false,
    })
    .select('id')
    .single()

  if (insertError || !newProduct) {
    return NextResponse.json({ error: insertError?.message ?? 'insert failed' }, { status: 500 })
  }

  const newId = newProduct.id

  // 스펙 테이블 복사
  const specTables = ['specs_common', 'specs_laptop', 'specs_smartphone', 'specs_tablet', 'specs_smartwatch'] as const
  for (const tableName of specTables) {
    const { data: specs } = await supabase
      .from(tableName)
      .select('*')
      .eq('product_id', id)
      .maybeSingle()

    if (specs) {
      const { id: _id, product_id: _pid, created_at: _ca, ...rest } = specs as Record<string, unknown> & { id: unknown; product_id: unknown; created_at: unknown }
      void _id; void _pid; void _ca
      await supabase.from(tableName).insert({ product_id: newId, ...rest })
    }
  }

  return NextResponse.json({ id: newId })
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
