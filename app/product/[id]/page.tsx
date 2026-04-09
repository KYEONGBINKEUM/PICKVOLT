import Navbar from '@/components/Navbar'
import ProductClient from './ProductClient'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getProduct(id: string) {
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, name, brand, category, price_usd, image_url,
      specs_common ( cpu_name, cpu_id, gpu_name, ram_gb, storage_gb, storage_type, os ),
      specs_laptop ( display_inch, display_resolution, display_hz, display_type, weight_kg, battery_wh, battery_hours ),
      specs_smartphone ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp ),
      specs_tablet ( display_inch, display_resolution, display_hz, display_type, weight_g, battery_mah, camera_main_mp, camera_front_mp, stylus_support, cellular )
    `)
    .eq('id', id)
    .single()

  if (error || !product) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common     = product.specs_common     as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop     = product.specs_laptop     as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = product.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet     = product.specs_tablet     as any
  const specSrc    = laptop ?? smartphone ?? tablet ?? {}

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

  return {
    id:         product.id,
    name:       product.name,
    brand:      product.brand,
    category:   product.category,
    price_usd:  product.price_usd,
    image_url:  product.image_url,
    specs: {
      cpu:             common?.cpu_name ?? null,
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
      weight:          laptop?.weight_kg
                         ? `${laptop.weight_kg} kg`
                         : (smartphone ?? tablet)?.weight_g
                         ? `${(smartphone ?? tablet).weight_g} g`
                         : null,
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

  const BASE_URL = 'https://www.pickvolt.com'
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
