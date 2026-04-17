import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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

    let query = supabase
      .from('products')
      .select(`
        id, name, brand, category, price_usd, image_url,
        specs_common ( ram_gb, cpu_id, cpu_name, gpu_name, os, launch_year ),
        specs_smartphone ( display_inch, display_resolution, display_hz, battery_mah, weight_g ),
        specs_laptop ( display_inch, display_resolution, display_hz, weight_kg, battery_wh, battery_hours ),
        specs_tablet ( display_inch, display_resolution, display_hz, battery_mah, weight_g, stylus_support )
      `)
      .eq('is_visible', true)

    if (category) query = query.eq('category', category)
    if (brand)    query = query.eq('brand', brand)
    if (minPrice) query = query.gte('price_usd', parseFloat(minPrice))
    if (maxPrice) query = query.lte('price_usd', parseFloat(maxPrice))
    if (q)        query = query.ilike('name', `%${q}%`)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message, results: [] }, { status: 500 })

    // Fetch CPU scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cpuIds = Array.from(new Set((data ?? []).map((p: any) => p.specs_common?.cpu_id).filter(Boolean)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cpuMap: Record<string, number> = {}

    if (cpuIds.length > 0) {
      const { data: cpus } = await supabase
        .from('cpus')
        .select('id, relative_score')
        .in('id', cpuIds as string[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cpuMap = Object.fromEntries((cpus ?? []).map((c: any) => [c.id, c.relative_score ?? 0]))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (data ?? []).map((p: any) => {
      const common     = p.specs_common
      const smartphone = p.specs_smartphone
      const laptop     = p.specs_laptop
      const tablet     = p.specs_tablet
      const specSrc    = smartphone ?? laptop ?? tablet ?? {}

      const performanceScore = common?.cpu_id ? (cpuMap[common.cpu_id] ?? 0) : 0

      // Calculate PPI from resolution string (e.g. "2596x1224")
      let ppi: number | null = null
      if (specSrc.display_resolution && specSrc.display_inch) {
        const match = String(specSrc.display_resolution).match(/(\d+)\s*[x×X]\s*(\d+)/)
        if (match) {
          const w = parseInt(match[1])
          const h = parseInt(match[2])
          ppi = Math.round(Math.sqrt(w * w + h * h) / specSrc.display_inch)
        }
      }

      return {
        id:               p.id,
        name:             p.name,
        brand:            p.brand,
        category:         p.category,
        price_usd:        p.price_usd,
        image_url:        p.image_url,
        performance_score: performanceScore,
        cpu_name:         common?.cpu_name  ?? null,
        gpu_name:         common?.gpu_name  ?? null,
        ram_gb:           common?.ram_gb    ?? null,
        os:               common?.os        ?? null,
        launch_year:      common?.launch_year ?? null,
        display_inch:     specSrc.display_inch ?? null,
        display_hz:       specSrc.display_hz  ?? null,
        ppi,
        // smartphone / tablet
        battery_mah:      (smartphone ?? tablet)?.battery_mah   ?? null,
        weight_g:         (smartphone ?? tablet)?.weight_g       ?? null,
        // laptop
        battery_wh:       laptop?.battery_wh    ?? null,
        battery_hours:    laptop?.battery_hours ?? null,
        weight_kg:        laptop?.weight_kg     ?? null,
        // tablet extra
        stylus_support:   tablet?.stylus_support ?? null,
      }
    })

    // RAM filter — ram_gb는 "8, 12, 16" 같은 다중 값일 수 있어 최대값 기준으로 비교
    const filtered = minRam
      ? products.filter((p) => {
          if (!p.ram_gb) return false
          const maxRam = Math.max(...String(p.ram_gb).split(',').map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n)))
          return maxRam >= parseFloat(minRam)
        })
      : products

    // Sort
    filtered.sort((a, b) => {
      switch (sort) {
        case 'price_asc':  return (a.price_usd ?? 999999) - (b.price_usd ?? 999999)
        case 'price_desc': return (b.price_usd ?? 0)      - (a.price_usd ?? 0)
        case 'newest':     return (b.launch_year ?? 0)     - (a.launch_year ?? 0)
        default:           return b.performance_score       - a.performance_score
      }
    })

    // Unique brands for filter UI
    const brands = Array.from(new Set(filtered.map((p) => p.brand).filter(Boolean))).sort()

    const total     = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    return NextResponse.json({ results: paginated, total, brands, page, limit })
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 })
  }
}
