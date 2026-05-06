import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null
function getClient() {
  if (!_supabase) _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _supabase
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getClient()

  const { id } = await params

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, brand, category, price_usd, image_url, source_url,
      specs_common ( cpu_name, cpu_id, gpu_name, gpu_id, ram_gb, storage_gb, storage_type, os, amazon_url, wifi_standard, bluetooth_version ),
      specs_laptop ( display_inch, display_resolution, display_hz, display_type, weight_kg, battery_wh, battery_hours ),
      specs_smartphone ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp ),
      specs_tablet ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp, stylus_support, cellular )
    `)
    .eq('id', id)
    .eq('is_visible', true)
    .single()

  if (error || !product) {
    console.error('[product/id] supabase error:', error)
    return NextResponse.json({ error: 'product not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = p.specs_common as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop = p.specs_laptop as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = p.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet = p.specs_tablet as any

  // ── 벤치마크 점수 조회 ──────────────────────────────────────────
  // relativeScore  : 비교 화면용 (0~1000, DB 트리거 자동 계산)
  // gb6Single/Multi: 제품 상세 화면용 절대값 (Geekbench 6 참고값)
  let relativeScore: number | null = null
  let gb6Single: number | null = null
  let gb6Multi: number | null = null
  let tdmark: number | null = null
  let antutu: number | null = null
  let cinebenchSingle: number | null = null
  let cinebenchMulti: number | null = null
  let cpuType: string | null = null
  let scoreSource: string | null = null
  let gpuRelativeScore: number | null = null

  // CPU, GPU, variants 병렬 조회
  const variantsPromise = supabase
    .from('product_variants')
    .select(`
      id, variant_name, cpu_name, cpu_id, gpu_name, gpu_id,
      ram_gb, storage_gb, price_usd, amazon_url, sort_order,
      cpus ( relative_score, gb6_single, gb6_multi, tdmark_score, antutu_score, cinebench_single, cinebench_multi, type ),
      gpus ( relative_score )
    `)
    .eq('product_id', p.id)
    .order('sort_order')
    .order('created_at')

  const [cpuRes, gpuRes, variantsRes] = await Promise.all([
    common?.cpu_id
      ? supabase.from('cpus')
          .select('relative_score, type, gb6_single, gb6_multi, tdmark_score, antutu_score, cinebench_single, cinebench_multi, score_source')
          .eq('id', common.cpu_id).single()
      : Promise.resolve({ data: null }),
    common?.gpu_id
      ? supabase.from('gpus').select('relative_score').eq('id', common.gpu_id).single()
      : Promise.resolve({ data: null }),
    variantsPromise,
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpu = cpuRes.data as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpu = gpuRes.data as any
  if (cpu) {
    relativeScore   = cpu.relative_score    ?? null
    cpuType         = cpu.type              ?? null
    gb6Single       = cpu.gb6_single        ?? null
    gb6Multi        = cpu.gb6_multi         ?? null
    tdmark          = cpu.tdmark_score      ?? null
    antutu          = cpu.antutu_score      ?? null
    cinebenchSingle = cpu.cinebench_single  ?? null
    cinebenchMulti  = cpu.cinebench_multi   ?? null
    scoreSource     = cpu.score_source      ?? null
  }
  if (gpu) gpuRelativeScore = gpu.relative_score ?? null

  const specSrc = laptop ?? smartphone ?? tablet ?? {}

  const displayParts = [
    specSrc.display_inch       ? `${specSrc.display_inch}"`     : null,
    specSrc.display_resolution ?? null,
    specSrc.display_hz         ? `${specSrc.display_hz}Hz`      : null,
    specSrc.display_type       ?? null,
  ].filter(Boolean)

  // storage_gb / ram_gb는 text 타입 — "256, 512, 1024" 형태로 저장됨
  // 각 값을 GB/TB 단위로 변환해서 표시
  function formatStorageValue(val: string): string {
    const n = parseFloat(val.trim())
    if (isNaN(n)) return val.trim()
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`
  }

  const storageLabel = common?.storage_gb
    ? String(common.storage_gb).split(',').map(formatStorageValue).join(' / ') +
      (common.storage_type ? ` ${common.storage_type}` : '')
    : null

  const ramLabel = common?.ram_gb
    ? String(common.ram_gb).split(',').map((v) => {
        const n = parseFloat(v.trim())
        return isNaN(n) ? v.trim() : `${n}GB`
      }).join(' / ')
    : null

  const specs = {
    cpu:             common?.cpu_name ?? null,
    gpuName:         common?.gpu_name ?? null,
    // 비교 화면용 — 0~1000 상대 점수
    performanceScore: relativeScore,
    gpuRelativeScore,
    // 제품 상세 화면용 — 벤치마크 절대값
    cpuType,
    gb6Single,
    gb6Multi,
    tdmark,
    antutu,
    cinebenchSingle,
    cinebenchMulti,
    scoreSource,
    ram:             ramLabel,
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
    os:              common?.os ?? null,
    wifi:            common?.wifi_standard ?? null,
    bluetooth:       common?.bluetooth_version ?? null,
    weight:          laptop?.weight_kg
                       ? `${laptop.weight_kg} kg`
                       : (smartphone ?? tablet)?.weight_g
                       ? `${(smartphone ?? tablet).weight_g} g`
                       : null,
    weightG:         (smartphone ?? tablet)?.weight_g ?? null,
    ipRating:        null,
  }

  // variants는 위에서 병렬 조회됨
  const { data: rawVariants } = variantsRes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants = (rawVariants ?? []).map((v: any) => ({
    id:           v.id,
    variant_name: v.variant_name,
    cpu_name:     v.cpu_name     ?? null,
    cpu_id:       v.cpu_id       ?? null,
    gpu_name:     v.gpu_name     ?? null,
    gpu_id:       v.gpu_id       ?? null,
    ram_gb:       v.ram_gb       ?? null,
    storage_gb:   v.storage_gb   ?? null,
    price_usd:    v.price_usd    ?? null,
    amazon_url:   v.amazon_url   ?? null,
    cpuBenchmarks: v.cpus ? {
      relative_score:   v.cpus.relative_score   ?? null,
      gb6_single:       v.cpus.gb6_single       ?? null,
      gb6_multi:        v.cpus.gb6_multi        ?? null,
      tdmark_score:     v.cpus.tdmark_score     ?? null,
      antutu_score:     v.cpus.antutu_score     ?? null,
      cinebench_single: v.cpus.cinebench_single ?? null,
      cinebench_multi:  v.cpus.cinebench_multi  ?? null,
      type:             v.cpus.type             ?? null,
    } : null,
    gpuRelativeScore: v.gpus?.relative_score ?? null,
  }))

  return NextResponse.json(
    {
      id:        p.id,
      name:      p.name,
      brand:     p.brand,
      category:  p.category,
      price_usd: p.price_usd,
      image_url: p.image_url,
      source_url: p.source_url,
      specs,
      raw: { ...common, ...(laptop ?? {}), ...(smartphone ?? {}), ...(tablet ?? {}) },
      variants,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
