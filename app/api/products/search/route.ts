import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: `missing env: url=${!!url} key=${!!key}`, results: [] },
        { status: 500 }
      )
    }

    const supabase = createClient(url, key)

    const { searchParams } = new URL(req.url)
    const q        = searchParams.get('q')        ?? ''
    const category = searchParams.get('category') ?? ''
    const brand    = searchParams.get('brand')    ?? ''

    let query = supabase
      .from('products')
      .select(`
        id, name, brand, category, image_url, price_usd,
        specs_common ( ram_gb, cpu_id, gpu_id, cpu_name, gpu_name, os, launch_year ),
        specs_smartphone ( display_inch, display_resolution, display_hz, battery_mah, weight_g ),
        specs_laptop     ( display_inch, display_resolution, display_hz, weight_kg, battery_wh, battery_hours ),
        specs_tablet     ( display_inch, display_resolution, display_hz, battery_mah, weight_g, stylus_support )
      `)
      .eq('is_visible', true)
      .limit(12)

    if (q)        query = query.ilike('name', `%${q}%`)
    if (category) query = query.eq('category', category)
    if (brand)    query = query.eq('brand', brand)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message, results: [] }, { status: 500 })

    // CPU / GPU scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cpuIds = Array.from(new Set((data ?? []).map((p: any) => p.specs_common?.cpu_id).filter(Boolean)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpuIds = Array.from(new Set((data ?? []).map((p: any) => p.specs_common?.gpu_id).filter(Boolean)))

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sorted = (data ?? []).map((p: any) => {
      const common     = p.specs_common
      const specSrc    = p.specs_smartphone ?? p.specs_laptop ?? p.specs_tablet ?? {}

      const cpuScore = common?.cpu_id ? (cpuMap[common.cpu_id] ?? 0) : 0
      const gpuScore = common?.gpu_id ? (gpuMap[common.gpu_id] ?? 0) : 0
      const hasCpu = cpuScore > 0, hasGpu = gpuScore > 0
      const performanceScore = hasCpu && hasGpu
        ? Math.round(cpuScore * 0.6 + gpuScore * 0.4)
        : hasCpu ? cpuScore : hasGpu ? gpuScore : 0

      const battery = (p.specs_smartphone ?? p.specs_tablet)?.battery_mah
        ? `${((p.specs_smartphone ?? p.specs_tablet).battery_mah as number).toLocaleString()} mAh`
        : p.specs_laptop?.battery_wh
        ? `${p.specs_laptop.battery_wh} Wh`
        : null

      const weight = p.specs_laptop?.weight_kg
        ? `${p.specs_laptop.weight_kg} kg`
        : (p.specs_smartphone ?? p.specs_tablet)?.weight_g
        ? `${(p.specs_smartphone ?? p.specs_tablet).weight_g} g`
        : null

      return {
        id: p.id, name: p.name, brand: p.brand, category: p.category,
        image_url: p.image_url, price_usd: p.price_usd,
        performance_score: performanceScore || null,
        cpu_name:     common?.cpu_name     ?? null,
        gpu_name:     common?.gpu_name     ?? null,
        ram_gb:       common?.ram_gb       ?? null,
        os:           common?.os           ?? null,
        launch_year:  common?.launch_year  ?? null,
        display_inch: specSrc.display_inch ?? null,
        display_hz:   specSrc.display_hz   ?? null,
        display_res:  specSrc.display_resolution ?? null,
        battery,
        weight,
      }
    }).sort((a: { performance_score: number | null; launch_year: number | null }, b: { performance_score: number | null; launch_year: number | null }) => {
      const aS = a.performance_score ?? 0, bS = b.performance_score ?? 0
      if (bS !== aS) return bS - aS
      return (b.launch_year ?? 0) - (a.launch_year ?? 0)
    })

    return NextResponse.json({ results: sorted, total: sorted.length })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}
