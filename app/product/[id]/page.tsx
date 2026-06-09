import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ProductClient from './ProductClient'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 3600  // 1시간 ISR

const BASE_URL = 'https://www.pickvolt.com'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// 카테고리별 스펙 테이블 선택
const CAT_SPEC: Record<string, string> = {
  laptop:     'specs_laptop ( display_inch, display_resolution, display_hz, display_type, weight_kg, battery_wh, battery_hours )',
  smartphone: 'specs_smartphone ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp )',
  tablet:     'specs_tablet ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp, stylus_support, cellular )',
  headphones: 'specs_headphones ( form_factor, driver_size_mm, frequency_response, noise_canceling, wireless, bluetooth_version, codec, battery_hours, weight_g, ip_rating, connectivity )',
  monitor:    'specs_monitor ( display_inch, display_resolution, panel_type, display_hz, response_time_ms, brightness_nits, hdr, aspect_ratio, adaptive_sync, curved, weight_kg, display_color_gamut )',
  tv:         'specs_tv ( display_inch, display_resolution, panel_type, display_hz, hdr, brightness_nits, smart_platform, audio_watts, hdmi_ports, weight_kg )',
  car:        'specs_car ( body_type, drivetrain, powertrain, engine_cc, horsepower, torque_nm, acceleration_0_100, top_speed_kmh, range_km, battery_kwh, fuel_efficiency_km_l, seating, cargo_liters, curb_weight_kg, segment, powertrain_variants )',
  smartwatch: 'specs_smartwatch ( chip_name, weight_g, water_resistance, compatible_os, has_gps, cellular )',
}

async function getProduct(id: string) {
  const supabase = makeSupabase()

  // 1단계: 카테고리 먼저 파악
  const { data: meta } = await supabase.from('products').select('id, category').eq('id', id).single()
  if (!meta) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catSpec = CAT_SPEC[(meta as any).category] ?? ''
  const selectStr = [
    'id, name, brand, category, price_usd, image_url, ai_summary_i18n',
    'specs_common ( cpu_name, cpu_id, gpu_name, ram_gb, storage_gb, storage_type, os, amazon_url, wifi_standard, bluetooth_version, launch_year )',
    catSpec,
  ].filter(Boolean).join(', ')

  const { data: product, error } = await supabase
    .from('products')
    .select(selectStr)
    .eq('id', id)
    .single()

  if (error || !product) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p          = product as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common     = p.specs_common     as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop     = p.specs_laptop     as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = p.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet     = p.specs_tablet     as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const car        = p.specs_car        as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headphones = p.specs_headphones as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monitor    = p.specs_monitor    as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tv         = p.specs_tv         as any
  const specSrc    = laptop ?? smartphone ?? tablet ?? monitor ?? tv ?? {}

  // storage_gb, ram_gb는 text 타입 ("256" / "64, 256, 512" / "1024")
  function formatStorageVal(v: string): string {
    const n = parseFloat(v.trim())
    if (isNaN(n)) return v.trim()
    return n >= 1024 ? `${n / 1024}TB` : `${n}GB`
  }
  const storageLabel = common?.storage_gb
    ? String(common.storage_gb).split(',').map(formatStorageVal).join(' / ') +
      (common.storage_type ? ` ${common.storage_type}` : '')
    : null
  const ramLabel = common?.ram_gb
    ? String(common.ram_gb).split(',').map((v) => {
        const n = parseFloat(v.trim())
        return isNaN(n) ? v.trim() : `${n}GB`
      }).join(' / ')
    : null

  const displayParts = [
    specSrc.display_inch       ? `${specSrc.display_inch}"`  : null,
    specSrc.display_resolution ?? null,
    specSrc.display_hz         ? `${specSrc.display_hz}Hz`   : null,
    specSrc.display_type       ?? null,
  ].filter(Boolean)

  // review aggregate (for Schema.org AggregateRating)
  const { data: reviewAgg } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', id)

  const reviewCount = (reviewAgg ?? []).length
  const reviewAvg = reviewCount > 0
    ? (reviewAgg!.reduce((s, r) => s + (r.rating ?? 0), 0) / reviewCount)
    : null

  // variants 조회
  const { data: rawVariants } = await supabase
    .from('product_variants')
    .select('id, variant_name, cpu_name, gpu_name, ram_gb, storage_gb, price_usd, amazon_url')
    .eq('product_id', p.id)
    .order('sort_order')
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variants = (rawVariants ?? []).map((v: any) => ({
    id:           v.id,
    variant_name: v.variant_name,
    cpu_name:     v.cpu_name     ?? null,
    gpu_name:     v.gpu_name     ?? null,
    ram_gb:       v.ram_gb       ?? null,
    storage_gb:   v.storage_gb   ?? null,
    price_usd:    v.price_usd    ?? null,
    amazon_url:   v.amazon_url   ?? null,
  }))

  return {
    id:         p.id,
    name:       p.name,
    brand:      p.brand,
    category:   p.category,
    price_usd:  p.price_usd,
    image_url:  p.image_url,
    amazon_url: common?.amazon_url ?? null,
    ai_summary_i18n: p.ai_summary_i18n as Record<string, string> | null ?? null,
    reviewCount,
    reviewAvg,
    variants,
    powertrain_variants: car?.powertrain_variants ?? null,
    raw: {
      ...( common      ?? {} ),
      ...( laptop      ?? {} ),
      ...( smartphone  ?? {} ),
      ...( tablet      ?? {} ),
      ...( headphones  ?? {} ),
      ...( monitor     ?? {} ),
      ...( tv          ?? {} ),
      ...( car         ?? {} ),
    },
    specs: {
      cpu:             common?.cpu_name ?? null,
      gpuName:         common?.gpu_name ?? null,
      ram:             ramLabel,
      storage:         storageLabel,
      display:         displayParts.length ? displayParts.join(' ') : null,
      camera:          (smartphone ?? tablet)?.camera_main_mp
                         ? `${(smartphone ?? tablet).camera_main_mp}MP + ${(smartphone ?? tablet).camera_front_mp ?? '?'}MP front`
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
      wifi:            common?.wifi_standard ?? null,
      bluetooth:       common?.bluetooth_version ?? null,
      weight:          laptop?.weight_kg
                         ? `${laptop.weight_kg} kg`
                         : (smartphone ?? tablet)?.weight_g
                         ? `${(smartphone ?? tablet).weight_g} g`
                         : null,
    },
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return {}

  const title = `${product.name} — Pickvolt`
  const description = [
    product.specs.cpu     ? `CPU: ${product.specs.cpu}`         : null,
    product.specs.ram     ? `RAM: ${product.specs.ram}`         : null,
    product.specs.display ? `Display: ${product.specs.display}` : null,
  ].filter(Boolean).join(' · ') || `${product.brand} ${product.name} specs & comparison.`

  const ogParams = new URLSearchParams({ type: 'product', name: product.name })
  if (product.brand)    ogParams.set('brand',    product.brand)
  if (product.category) ogParams.set('category', product.category)
  if (product.price_usd) ogParams.set('price',   String(product.price_usd))
  const ogImageUrl = `${BASE_URL}/api/og?${ogParams.toString()}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:      `${BASE_URL}/product/${product.id}`,
      siteName: 'Pickvolt',
      images:   [{ url: ogImageUrl, width: 1200, height: 630, alt: product.name }],
      type:     'website',
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImageUrl],
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  const productUrl = `${BASE_URL}/product/${product.id}`

  const productSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: product.name,
        brand: { '@type': 'Brand', name: product.brand },
        category: product.category,
        ...(product.image_url ? { image: product.image_url } : {}),
        ...(product.price_usd ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: product.price_usd,
            availability: 'https://schema.org/InStock',
          },
        } : {}),
        ...(product.reviewAvg !== null && product.reviewCount >= 3 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(product.reviewAvg * 10) / 10,
            bestRating: 10,
            worstRating: 1,
            ratingCount: product.reviewCount,
          },
        } : {}),
        description: [
          product.specs.cpu ? `CPU: ${product.specs.cpu}` : null,
          product.specs.ram ? `RAM: ${product.specs.ram}` : null,
          product.specs.storage ? `Storage: ${product.specs.storage}` : null,
          product.specs.display ? `Display: ${product.specs.display}` : null,
        ].filter(Boolean).join(', ') || `${product.brand} ${product.name} specifications and comparison.`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: product.category.charAt(0).toUpperCase() + product.category.slice(1) + 's', item: `${BASE_URL}/categories/${product.category}` },
          { '@type': 'ListItem', position: 3, name: product.name, item: productUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">
        <ProductClient product={product} />
      </main>
    </>
  )
}
