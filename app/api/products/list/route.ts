import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { computeRelativeScores, computePPI, type CategoryStats } from '@/lib/scoring'

// 모듈 레벨 캐싱 — 같은 서버 인스턴스에서 재사용
let _supabase: SupabaseClient | null = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') ?? ''
    const brand    = searchParams.get('brand')    ?? ''
    const sort     = searchParams.get('sort')     ?? 'performance'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRam   = searchParams.get('minRam')
    const q        = searchParams.get('q')        ?? ''
    const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit    = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') ?? '24')))

    // 카테고리별 필요한 스펙 테이블만 JOIN (불필요한 테이블 JOIN 시 에러 방지)
    const newCatSpecs: Record<string, string> = {
      headphones: 'specs_headphones ( form_factor, noise_canceling, wireless, battery_hours, driver_size_mm )',
      monitor:    'specs_monitor ( display_inch, panel_type, display_hz, hdr, brightness_nits )',
      tv:         'specs_tv ( display_inch, panel_type, display_hz, hdr, smart_platform )',
      car:        'specs_car ( powertrain, horsepower, torque_nm, acceleration_0_100, range_km, body_type, drivetrain, generation, production_end )',
      smartwatch: 'specs_smartwatch ( chip_name, water_resistance )',
    }
    const extraSpec = category && newCatSpecs[category] ? `,\n        ${newCatSpecs[category]}` : ''

    let query = supabase
      .from('products')
      .select(`
        id, name, brand, category, price_usd, image_url,
        specs_common ( ram_gb, cpu_id, gpu_id, cpu_name, gpu_name, os, launch_year ),
        specs_smartphone ( display_inch, display_resolution, display_hz, battery_mah, weight_g ),
        specs_laptop ( display_inch, display_resolution, display_hz, weight_kg, battery_wh, battery_hours ),
        specs_tablet ( display_inch, display_resolution, display_hz, battery_mah, weight_g, stylus_support )${extraSpec}
      `)
      .eq('is_visible', true)

    if (category) query = query.eq('category', category)
    if (brand)    query = query.eq('brand', brand)
    if (minPrice) query = query.gte('price_usd', parseFloat(minPrice))
    if (maxPrice) query = query.lte('price_usd', parseFloat(maxPrice))
    if (q)        query = query.ilike('name', `%${q}%`)

    const { data: rawData, error } = await query

    if (error) return NextResponse.json({ error: error.message, results: [] }, { status: 500 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (rawData ?? []) as any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commonCpuIds = data.map((p: any) => p.specs_common?.cpu_id).filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commonGpuIds = data.map((p: any) => p.specs_common?.gpu_id).filter(Boolean)
    const allIds = data.map((p: { id: string }) => p.id)

    // Step 1: fetch variants first to collect variant cpu/gpu ids
    const variantResult = allIds.length > 0
      ? await supabase.from('product_variants')
          .select('id, product_id, variant_name, price_usd, ram_gb, storage_gb, cpu_name, cpu_id, gpu_name, gpu_id, is_default')
          .in('product_id', allIds)
          .order('is_default', { ascending: false })
          .order('sort_order')
      : { data: [] as { id: string; product_id: string; variant_name: string; price_usd: number | null; ram_gb: number | null; storage_gb: number | null; cpu_name: string | null; cpu_id: string | null; gpu_name: string | null; gpu_id: string | null; is_default: boolean | null }[] }

    // Step 2: collect all cpu/gpu ids (common + variants) for score lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variantCpuIds = (variantResult.data ?? []).map((v: any) => v.cpu_id).filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variantGpuIds = (variantResult.data ?? []).map((v: any) => v.gpu_id).filter(Boolean)
    const cpuIds = Array.from(new Set([...commonCpuIds, ...variantCpuIds]))
    const gpuIds = Array.from(new Set([...commonGpuIds, ...variantGpuIds]))

    // Step 3: fetch cpu/gpu scores
    const [cpuResult, gpuResult] = await Promise.all([
      cpuIds.length > 0
        ? supabase.from('cpus').select('id, relative_score').in('id', cpuIds as string[])
        : Promise.resolve({ data: [] as { id: string; relative_score: number }[] }),
      gpuIds.length > 0
        ? supabase.from('gpus').select('id, relative_score').in('id', gpuIds as string[])
        : Promise.resolve({ data: [] as { id: string; relative_score: number }[] }),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cpuMap: Record<string, number> = Object.fromEntries(((cpuResult.data ?? []) as any[]).map((c) => [c.id, c.relative_score ?? 0]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpuMap: Record<string, number> = Object.fromEntries(((gpuResult.data ?? []) as any[]).map((g) => [g.id, g.relative_score ?? 0]))

    // variant map + default variant map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variantMap: Record<string, any[]> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultVariantMap: Record<string, any> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (variantResult.data ?? []) as any[]) {
      if (!variantMap[row.product_id]) variantMap[row.product_id] = []
      variantMap[row.product_id].push({
        id: row.id, variant_name: row.variant_name, price_usd: row.price_usd,
        ram_gb: row.ram_gb, storage_gb: row.storage_gb, cpu_name: row.cpu_name, gpu_name: row.gpu_name,
        is_default: row.is_default ?? false,
      })
      if (row.is_default) defaultVariantMap[row.product_id] = row
    }

    // Pass 1 — build raw product rows (no final score yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawProducts = (data ?? []).map((p: any) => {
      const common     = p.specs_common
      const smartphone = p.specs_smartphone
      const laptop     = p.specs_laptop
      const tablet     = p.specs_tablet
      const specSrc    = smartphone ?? laptop ?? tablet ?? {}
      const smartwatch = p.specs_smartwatch
      const headphones = p.specs_headphones
      const monitor    = p.specs_monitor
      const tv         = p.specs_tv
      const car        = p.specs_car

      const defVariant  = defaultVariantMap[p.id]
      const activeCpuId = defVariant?.cpu_id ?? common?.cpu_id ?? null
      const activeGpuId = defVariant?.gpu_id ?? common?.gpu_id ?? null
      const cpuRelScore = activeCpuId ? (cpuMap[activeCpuId] ?? 0) : 0
      const gpuRelScore = activeGpuId ? (gpuMap[activeGpuId] ?? 0) : 0

      const ppi = computePPI(specSrc.display_resolution, specSrc.display_inch)

      return {
        id: p.id, name: p.name, brand: p.brand, category: p.category,
        price_usd: p.price_usd, image_url: p.image_url,
        cpu_name: common?.cpu_name ?? null, gpu_name: common?.gpu_name ?? null,
        ram_gb: common?.ram_gb ?? null, os: common?.os ?? null, launch_year: common?.launch_year ?? null,
        display_inch: specSrc.display_inch ?? null, display_hz: specSrc.display_hz ?? null,
        display_resolution: specSrc.display_resolution ?? null, ppi,
        battery_mah: (smartphone ?? tablet)?.battery_mah ?? null,
        weight_g: (smartphone ?? tablet)?.weight_g ?? null,
        battery_wh: laptop?.battery_wh ?? null, battery_hours: laptop?.battery_hours ?? null,
        weight_kg: laptop?.weight_kg ?? null,
        stylus_support: tablet?.stylus_support ?? null,
        // headphones
        form_factor: headphones?.form_factor ?? null,
        noise_canceling: headphones?.noise_canceling ?? null,
        headphone_battery_hours: headphones?.battery_hours ?? null,
        driver_size_mm: headphones?.driver_size_mm ?? null,
        // monitor
        monitor_display_inch: monitor?.display_inch ?? null,
        panel_type: monitor?.panel_type ?? tv?.panel_type ?? null,
        monitor_hz: monitor?.display_hz ?? null,
        monitor_hdr: monitor?.hdr ?? null,
        monitor_brightness: monitor?.brightness_nits ?? null,
        // tv
        tv_display_inch: tv?.display_inch ?? null,
        tv_hz: tv?.display_hz ?? null,
        tv_hdr: tv?.hdr ?? null,
        smart_platform: tv?.smart_platform ?? null,
        // car
        powertrain: car?.powertrain ?? null,
        horsepower: car?.horsepower ?? null,
        torque_nm: car?.torque_nm ?? null,
        acceleration_0_100: car?.acceleration_0_100 ?? null,
        range_km: car?.range_km ?? null,
        body_type: car?.body_type ?? null,
        drivetrain: car?.drivetrain ?? null,
        production_end: car?.production_end ?? null,
        // smartwatch
        chip_name: smartwatch?.chip_name ?? null,
        water_resistance: smartwatch?.water_resistance ?? null,
        variants: variantMap[p.id] ?? [],
        // raw scores for stats computation
        _cpuRel: cpuRelScore,
        _gpuRel: gpuRelScore,
      }
    })

    // Pass 2 — compute CategoryStats then score each product using the same
    // formula as the compare page (lib/scoring.ts computeRelativeScores)
    const maxOf = (arr: number[]) => arr.length ? Math.max(...arr) : 0
    const minOf = (arr: number[]) => arr.length ? Math.min(...arr) : 0
    const statsOf = (arr: number[]) => ({ min: minOf(arr), max: maxOf(arr) })
    const firstNum = (v: string | number | null | undefined): number | null => {
      if (v == null) return null
      const n = parseFloat(String(v).split(',')[0].trim())
      return isNaN(n) ? null : n
    }

    const cpuRels    = rawProducts.map((p) => p._cpuRel).filter((n) => n > 0)
    const gpuRels    = rawProducts.map((p) => p._gpuRel).filter((n) => n > 0)
    const rams       = rawProducts.map((p) => firstNum(p.ram_gb)).filter((n): n is number => n != null)
    const ppis       = rawProducts.map((p) => p.ppi).filter((n): n is number => n != null)
    const refreshes  = rawProducts.map((p) => p.display_hz).filter((n): n is number => n != null)
    const batWhs     = rawProducts.map((p) => p.battery_wh).filter((n): n is number => n != null)
    const batMahs    = rawProducts.map((p) => p.battery_mah).filter((n): n is number => n != null)
    const weightGs   = rawProducts.map((p) => p.weight_g).filter((n): n is number => n != null)
    const weightKgs  = rawProducts.map((p) => p.weight_kg).filter((n): n is number => n != null)
    const storages   = rawProducts.map((p) => firstNum(p.variants[0]?.storage_gb ?? null)).filter((n): n is number => n != null)

    const stats: CategoryStats = {
      relativeScore: statsOf(cpuRels),
      ram:           statsOf(rams),
      storage:       statsOf(storages.length ? storages : [0]),
      batteryMah:    statsOf(batMahs),
      batteryWh:     statsOf(batWhs),
      batteryHours:  { min: 0, max: 0 },
      cameraMP:      { min: 0, max: 0 },
      ppi:           statsOf(ppis),
      refreshHz:     statsOf(refreshes),
      weightG:       statsOf(weightGs),
      weightKg:      statsOf(weightKgs),
      gpuRelativeMax: maxOf(gpuRels),
    }

    // detect primary category for scoring formula
    const primaryCategory = category || (rawProducts[0]?.category?.toLowerCase() ?? '')

    const products = rawProducts.map((p) => {
      const scored = computeRelativeScores(
        {
          category:         primaryCategory,
          relativeScore:    p._cpuRel || null,
          gpuRelativeScore: p._gpuRel || null,
          ram_gb:           p.ram_gb,
          battery_wh:       p.battery_wh,
          battery_mah:      p.battery_mah,
          display_resolution: p.display_resolution,
          display_inch:     p.display_inch,
          refresh_hz:       p.display_hz,
        },
        stats,
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _cpuRel, _gpuRel, ...rest } = p
      return { ...rest, performance_score: scored.overall }
    })

    // RAM filter (client-side, needs parsed value)
    const filtered = minRam
      ? products.filter((p) => {
          if (!p.ram_gb) return false
          const maxRam = Math.max(...String(p.ram_gb).split(',').map((v: string) => parseFloat(v.trim())).filter((n: number) => !isNaN(n)))
          return maxRam >= parseFloat(minRam)
        })
      : products

    // 실제 표시 가격 = variant 최저가 우선, 없으면 product.price_usd
    const effectivePrice = (p: typeof filtered[number]): number => {
      const variantPrices = p.variants
        .map((v: { price_usd: number | null }) => v.price_usd)
        .filter((v: number | null): v is number => v != null && v > 0)
      if (variantPrices.length > 0) return Math.min(...variantPrices)
      return p.price_usd ?? 999999
    }

    filtered.sort((a, b) => {
      switch (sort) {
        case 'price_asc':  return effectivePrice(a) - effectivePrice(b)
        case 'price_desc': return effectivePrice(b) - effectivePrice(a)
        case 'newest':     return (b.launch_year ?? 0) - (a.launch_year ?? 0)
        default:           return b.performance_score  - a.performance_score
      }
    })

    const brands     = Array.from(new Set(filtered.map((p) => p.brand).filter(Boolean))).sort()
    const total      = filtered.length
    const paginated  = filtered.slice((page - 1) * limit, page * limit)

    const res = NextResponse.json({ results: paginated, total, brands, page, limit })
    res.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')
    return res
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}
