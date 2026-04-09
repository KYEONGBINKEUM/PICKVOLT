import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600 // 1시간 캐시 — 신제품 추가 시 자동 갱신

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
      specs_common ( cpu_id, ram_gb, storage_gb ),
      specs_smartphone ( display_inch, display_resolution, battery_mah, camera_main_mp, weight_g ),
      specs_laptop ( display_inch, display_resolution, battery_wh, battery_hours, weight_kg ),
      specs_tablet ( display_inch, display_resolution, battery_mah, camera_main_mp )
    `)
    .eq('category', category)
    .eq('is_visible', true)

  if (error || !data) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Fetch CPU relative scores
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cpuIds = Array.from(new Set(data.map((p: any) => p.specs_common?.cpu_id).filter(Boolean)))
  let cpuMap: Record<string, number> = {}
  if (cpuIds.length > 0) {
    const { data: cpus } = await supabase
      .from('cpus')
      .select('id, relative_score')
      .in('id', cpuIds as string[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cpuMap = Object.fromEntries((cpus ?? []).map((c: any) => [c.id, c.relative_score ?? 0]))
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

    const cpuId = common?.cpu_id
    if (cpuId && cpuMap[cpuId]) vals.relativeScore.push(cpuMap[cpuId])

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
    weightG:       minMax(vals.weightG),
    weightKg:      minMax(vals.weightKg),
  })
}
