import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic' // 항상 최신 데이터 반환

function firstNum(val: string | number | null | undefined): number | null {
  if (val == null) return null
  const n = parseFloat(String(val).split(',')[0].trim())
  return isNaN(n) ? null : n
}

function computePPI(resolution: string | null | undefined, inch: number | null | undefined): number | null {
  if (!resolution || !inch || inch === 0) return null
  const match = String(resolution).match(/(\d+)\s*[x×X]\s*(\d+)/)
  if (!match) return null
  const w = parseInt(match[1])
  const h = parseInt(match[2])
  return Math.round(Math.sqrt(w * w + h * h) / inch)
}

function minMax(arr: number[]): { min: number; max: number } {
  if (arr.length === 0) return { min: 0, max: 1 }
  return { min: Math.min(...arr), max: Math.max(...arr) }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const category = new URL(req.url).searchParams.get('category') ?? ''
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  const { data, error } = await supabase
    .from('products')
    .select(`
      specs_common ( cpu_id, gpu_id, ram_gb, storage_gb ),
      specs_smartphone ( display_inch, display_resolution, display_hz, battery_mah, camera_main_mp, weight_g ),
      specs_laptop ( display_inch, display_resolution, display_hz, battery_wh, battery_hours, weight_kg ),
      specs_tablet ( display_inch, display_resolution, display_hz, battery_mah, camera_main_mp )
    `)
    .eq('category', category)
    .eq('is_visible', true)

  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Fetch CPU relative scores + benchmark maxes for this category only
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpuIds = Array.from(new Set(data.map((p: any) => p.specs_common?.cpu_id).filter(Boolean)))
  let cpuMap: Record<string, number> = {}
  const cpuBenchMaxes = {
    gb6Single: 0, gb6Multi: 0, tdmark: 0, antutu: 0,
    cinebenchSingle: 0, cinebenchMulti: 0, passmarkSingle: 0, passmarkMulti: 0,
  }
  if (cpuIds.length > 0) {
    const { data: cpus } = await supabase
      .from('cpus')
      .select('id, relative_score, gb6_single, gb6_multi, tdmark_score, antutu_score, cinebench_single, cinebench_multi, passmark_single, passmark_multi')
      .in('id', cpuIds as string[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cpuMap = Object.fromEntries((cpus ?? []).map((c: any) => [c.id, c.relative_score ?? 0]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of (cpus ?? []) as any[]) {
      if (c.gb6_single)        cpuBenchMaxes.gb6Single       = Math.max(cpuBenchMaxes.gb6Single,       c.gb6_single)
      if (c.gb6_multi)         cpuBenchMaxes.gb6Multi        = Math.max(cpuBenchMaxes.gb6Multi,        c.gb6_multi)
      if (c.tdmark_score)      cpuBenchMaxes.tdmark          = Math.max(cpuBenchMaxes.tdmark,          c.tdmark_score)
      if (c.antutu_score)      cpuBenchMaxes.antutu          = Math.max(cpuBenchMaxes.antutu,          c.antutu_score)
      if (c.cinebench_single)  cpuBenchMaxes.cinebenchSingle = Math.max(cpuBenchMaxes.cinebenchSingle, c.cinebench_single)
      if (c.cinebench_multi)   cpuBenchMaxes.cinebenchMulti  = Math.max(cpuBenchMaxes.cinebenchMulti,  c.cinebench_multi)
      if (c.passmark_single)   cpuBenchMaxes.passmarkSingle  = Math.max(cpuBenchMaxes.passmarkSingle,  c.passmark_single)
      if (c.passmark_multi)    cpuBenchMaxes.passmarkMulti   = Math.max(cpuBenchMaxes.passmarkMulti,   c.passmark_multi)
    }
  }

  // Fetch GPU relative scores for this category
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpuIds = Array.from(new Set(data.map((p: any) => p.specs_common?.gpu_id).filter(Boolean)))
  let gpuMap: Record<string, number> = {}
  let gpuRelativeMax = 0
  if (gpuIds.length > 0) {
    const { data: gpus } = await supabase
      .from('gpus')
      .select('id, relative_score')
      .in('id', gpuIds as string[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gpuMap = Object.fromEntries((gpus ?? []).map((g: any) => [g.id, g.relative_score ?? 0]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const g of (gpus ?? []) as any[]) {
      if (g.relative_score) gpuRelativeMax = Math.max(gpuRelativeMax, g.relative_score)
    }
  }

  const vals = {
    relativeScore: [] as number[],
    ram:           [] as number[],
    storage:       [] as number[],
    batteryMah:    [] as number[],
    batteryWh:     [] as number[],
    batteryHours:  [] as number[],
    cameraMP:      [] as number[],
    ppi:           [] as number[],
    refreshHz:     [] as number[],
    weightG:       [] as number[],
    weightKg:      [] as number[],
  }

  for (const p of data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const common     = p.specs_common     as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const smartphone = p.specs_smartphone as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laptop     = p.specs_laptop     as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tablet     = p.specs_tablet     as any
    const specSrc    = smartphone ?? laptop ?? tablet ?? {}

    const cpuScore = common?.cpu_id ? (cpuMap[common.cpu_id] ?? 0) : 0
    const gpuScore = common?.gpu_id ? (gpuMap[common.gpu_id] ?? 0) : 0
    const hasCpu = cpuScore > 0
    const hasGpu = gpuScore > 0
    const combinedScore = hasCpu && hasGpu
      ? Math.round(cpuScore * 0.6 + gpuScore * 0.4)
      : hasCpu ? cpuScore : gpuScore
    if (combinedScore > 0) vals.relativeScore.push(combinedScore)

    const ram = firstNum(common?.ram_gb)
    if (ram) vals.ram.push(ram)

    const storage = firstNum(common?.storage_gb)
    if (storage) vals.storage.push(storage)

    const batMah = smartphone?.battery_mah ?? tablet?.battery_mah
    if (batMah) vals.batteryMah.push(batMah)

    if (laptop?.battery_wh)    vals.batteryWh.push(laptop.battery_wh)
    if (laptop?.battery_hours) vals.batteryHours.push(laptop.battery_hours)

    const cam = smartphone?.camera_main_mp ?? tablet?.camera_main_mp
    if (cam) vals.cameraMP.push(cam)

    const ppi = computePPI(specSrc.display_resolution, specSrc.display_inch)
    if (ppi) vals.ppi.push(ppi)

    const hz = specSrc.display_hz != null ? Number(specSrc.display_hz) : null
    if (hz && hz > 0) vals.refreshHz.push(hz)

    const wg = smartphone?.weight_g ?? tablet?.weight_g
    if (wg) vals.weightG.push(wg)

    if (laptop?.weight_kg) vals.weightKg.push(laptop.weight_kg)
  }

  return NextResponse.json({
    category,
    count: data.length,
    relativeScore: minMax(vals.relativeScore),
    ram:           minMax(vals.ram),
    storage:       minMax(vals.storage),
    batteryMah:    minMax(vals.batteryMah),
    batteryWh:     minMax(vals.batteryWh),
    batteryHours:  minMax(vals.batteryHours),
    cameraMP:      minMax(vals.cameraMP),
    ppi:           minMax(vals.ppi),
    refreshHz:     minMax(vals.refreshHz),
    weightG:       minMax(vals.weightG),
    weightKg:      minMax(vals.weightKg),
    cpuBenchMaxes,
    gpuRelativeMax,
  })
}
