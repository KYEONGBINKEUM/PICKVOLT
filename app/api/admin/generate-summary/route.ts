import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

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

async function generateSummaryForProduct(
  supabase: ReturnType<typeof makeServiceClient>,
  ai: GoogleGenAI,
  productId: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, brand, category, price_usd,
      specs_common ( cpu_name, gpu_name, ram_gb, storage_gb, storage_type, os, wifi_standard, bluetooth_version ),
      specs_laptop ( display_inch, display_resolution, display_hz, display_type, weight_kg, battery_wh, battery_hours ),
      specs_smartphone ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp ),
      specs_tablet ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, stylus_support, cellular )
    `)
    .eq('id', productId)
    .single()

  if (!product) return { ok: false, error: 'not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = product.specs_common as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l = product.specs_laptop as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = product.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = product.specs_tablet as any
  const spec = l ?? s ?? t ?? {}

  const specLines = [
    c?.cpu_name     ? `CPU: ${c.cpu_name}`                                 : null,
    c?.gpu_name     ? `GPU: ${c.gpu_name}`                                 : null,
    c?.ram_gb       ? `RAM: ${c.ram_gb}GB`                                 : null,
    c?.storage_gb   ? `Storage: ${c.storage_gb}GB ${c.storage_type ?? ''}`.trim() : null,
    spec.display_inch ? `Display: ${spec.display_inch}" ${spec.display_resolution ?? ''} ${spec.display_hz ? spec.display_hz + 'Hz' : ''} ${spec.display_type ?? ''}`.trim() : null,
    l?.battery_hours  ? `Battery life: ${l.battery_hours} hours`           : null,
    l?.battery_wh     ? `Battery: ${l.battery_wh}Wh`                      : null,
    s?.battery_mah || t?.battery_mah ? `Battery: ${(s ?? t).battery_mah}mAh` : null,
    s?.camera_main_mp ? `Camera: ${s.camera_main_mp}MP main / ${s.camera_front_mp ?? '?'}MP front` : null,
    l?.weight_kg      ? `Weight: ${l.weight_kg}kg`                         : null,
    c?.os             ? `OS: ${c.os}`                                       : null,
    product.price_usd ? `Price: from $${product.price_usd}`               : null,
  ].filter(Boolean).join('\n')

  const prompt = `You are a tech product editor. Write a concise editorial summary (3–4 sentences, plain text, no markdown) for the following product. Cover what makes it stand out, who it's best suited for, and one honest trade-off. Be specific, not generic.

Product: ${product.brand} ${product.name} (${product.category})
${specLines}

Write the summary now:`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-05-20',
    contents: prompt,
  })

  const text = response.text?.trim()
  if (!text) return { ok: false, error: 'empty response' }

  const { error } = await supabase
    .from('products')
    .update({ ai_summary: text })
    .eq('id', productId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// POST /api/admin/generate-summary
// body: { product_id: string } — 단일 제품
// body: { batch: true }        — ai_summary 없는 전체 제품 순차 생성
export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    if (!ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const supabase = makeServiceClient()
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    // 단일 제품
    if (body.product_id) {
      const result = await generateSummaryForProduct(supabase, ai, body.product_id)
      return NextResponse.json(result)
    }

    // 배치: ai_summary가 없는 제품을 한 번에 5개씩 처리 (Vercel 타임아웃 대응)
    if (body.batch) {
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .is('ai_summary', null)
        .limit(5)

      if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
      if (!products || products.length === 0) {
        return NextResponse.json({ ok: true, processed: 0, done: true, message: '모든 제품의 요약이 완료됐습니다.' })
      }

      let processed = 0
      let failed = 0
      for (const p of products) {
        const result = await generateSummaryForProduct(supabase, ai, p.id)
        if (result.ok) processed++
        else failed++
        await new Promise(r => setTimeout(r, 200))
      }

      // 남은 제품 수 확인
      const { count: remaining } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .is('ai_summary', null)

      return NextResponse.json({ ok: true, processed, failed, total: products.length, remaining: remaining ?? 0 })
    }

    return NextResponse.json({ error: 'product_id or batch required' }, { status: 400 })
  } catch (e) {
    console.error('[generate-summary]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
