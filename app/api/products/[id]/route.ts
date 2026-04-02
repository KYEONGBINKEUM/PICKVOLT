import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { id } = params

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, brand, category, price_usd, image_url, source_url,
      specs_common ( cpu_name, cpu_id, gpu_name, ram_gb, storage_gb, storage_type, os ),
      specs_laptop ( display_inch, display_resolution, display_hz, display_type, weight_kg, battery_wh, battery_hours ),
      specs_smartphone ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp ),
      specs_tablet ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, stylus_support, cellular )
    `)
    .eq('id', id)
    .single()

  if (error || !product) {
    console.error('[product/id] supabase error:', error)
    return NextResponse.json({ error: 'product not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = product.specs_common as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop = product.specs_laptop as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = product.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet = product.specs_tablet as any

  // ── 벤치마크 점수 조회 ──────────────────────────────────────────
  // relativeScore  : 비교 화면용 (0~1000, DB 트리거 자동 계산)
  // gb6Single/Multi: 제품 상세 화면용 절대값 (Geekbench 6 참고값)
  let relativeScore: number | null = null
  let gb6Single: number | null = null
  let gb6Multi: number | null = null
  let scoreSource: string | null = null

  if (common?.cpu_id) {
    const { data: cpu } = await supabase
      .from('cpus')
      .select('relative_score, gb6_single, gb6_multi, score_source')
      .eq('id', common.cpu_id)
      .single()

    relativeScore = cpu?.relative_score ?? null
    gb6Single     = cpu?.gb6_single    ?? null
    gb6Multi      = cpu?.gb6_multi     ?? null
    scoreSource   = cpu?.score_source  ?? null
  }

  const specSrc = laptop ?? smartphone ?? tablet ?? {}

  const displayParts = [
    specSrc.display_inch       ? `${specSrc.display_inch}"`     : null,
    specSrc.display_resolution ?? null,
    specSrc.display_hz         ? `${specSrc.display_hz}Hz`      : null,
    specSrc.display_type       ?? null,
  ].filter(Boolean)

  const storageLabel = common?.storage_gb
    ? `${common.storage_gb >= 1024 ? `${common.storage_gb / 1024}TB` : `${common.storage_gb}GB`}${common.storage_type ? ` ${common.storage_type}` : ''}`
    : null

  const specs = {
    cpu:             common?.cpu_name ?? null,
    // 비교 화면용 — 0~1000 상대 점수
    performanceScore: relativeScore,
    // 제품 상세 화면용 — Geekbench 6 절대값
    gb6Single,
    gb6Multi,
    scoreSource,
    ram:             common?.ram_gb   ? `${common.ram_gb}GB` : null,
    storage:         storageLabel,
    display:         displayParts.length ? displayParts.join(' ') : null,
    camera:          smartphone?.camera_main_mp
                       ? `${smartphone.camera_main_mp}MP + ${smartphone.camera_front_mp ?? '?'}MP front`
                       : null,
    batteryCapacity: smartphone?.battery_mah
                       ? `${smartphone.battery_mah} mAh`
                       : tablet?.battery_mah
                       ? `${tablet.battery_mah} mAh`
                       : laptop?.battery_wh
                       ? `${laptop.battery_wh} Wh`
                       : null,
    batteryLife:     laptop?.battery_hours ? `${laptop.battery_hours} hours` : null,
    os:              common?.os ?? null,
    weight:          laptop?.weight_kg
                       ? `${laptop.weight_kg} kg`
                       : (smartphone ?? tablet)?.weight_g
                       ? `${(smartphone ?? tablet).weight_g} g`
                       : null,
    weightG:         (smartphone ?? tablet)?.weight_g ?? null,
    ipRating:        null,
  }

  return NextResponse.json({
    id:        product.id,
    name:      product.name,
    brand:     product.brand,
    category:  product.category,
    price_usd: product.price_usd,
    image_url: product.image_url,
    source_url: product.source_url,
    specs,
    raw: { ...common, ...specSrc },
  })
}
