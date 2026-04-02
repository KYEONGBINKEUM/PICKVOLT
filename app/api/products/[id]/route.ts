import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // 1. Product + all spec tables
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
    return NextResponse.json({ error: 'product not found' }, { status: 404 })
  }

  // 2. CPU performance score (if linked)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = product.specs_common as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop = product.specs_laptop as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = product.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet = product.specs_tablet as any

  let performanceScore: number | null = null
  if (common?.cpu_id) {
    const { data: cpu } = await supabase
      .from('cpus')
      .select('performance_score')
      .eq('id', common.cpu_id)
      .single()
    performanceScore = cpu?.performance_score ?? null
  }

  // 3. Map to ProductSpecs shape
  const specSrc = laptop ?? smartphone ?? tablet ?? {}

  const displayParts = [
    specSrc.display_inch ? `${specSrc.display_inch}"` : null,
    specSrc.display_resolution ?? null,
    specSrc.display_hz ? `${specSrc.display_hz}Hz` : null,
    specSrc.display_type ?? null,
  ].filter(Boolean)

  const storageLabel = common?.storage_gb
    ? `${common.storage_gb >= 1024 ? `${common.storage_gb / 1024}TB` : `${common.storage_gb}GB`}${common.storage_type ? ` ${common.storage_type}` : ''}`
    : null

  const cameraLabel = smartphone?.camera_main_mp
    ? `${smartphone.camera_main_mp}MP + ${smartphone.camera_front_mp ?? '?'}MP front`
    : null

  const batteryCapacity = smartphone?.battery_mah
    ? `${smartphone.battery_mah} mAh`
    : tablet?.battery_mah
    ? `${tablet.battery_mah} mAh`
    : laptop?.battery_wh
    ? `${laptop.battery_wh} Wh`
    : null

  const weightLabel = laptop?.weight_kg
    ? `${laptop.weight_kg} kg`
    : (smartphone ?? tablet)?.weight_g
    ? `${(smartphone ?? tablet).weight_g} g`
    : null

  const specs = {
    cpu: common?.cpu_name ?? null,
    cpuSpeedMHz: null,
    performanceScore,
    ram: common?.ram_gb ? `${common.ram_gb}GB` : null,
    storage: storageLabel,
    display: displayParts.length ? displayParts.join(' ') : null,
    camera: cameraLabel,
    batteryCapacity,
    batteryLife: laptop?.battery_hours ? `${laptop.battery_hours} hours` : null,
    os: common?.os ?? null,
    weight: weightLabel,
    weightG: (smartphone ?? tablet)?.weight_g ?? null,
    ipRating: null,
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price_usd: product.price_usd,
    image_url: product.image_url,
    source_url: product.source_url,
    specs,
    raw: { ...common, ...specSrc },
  })
}
