import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import AddToCompareButton from './AddToCompareButton'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Specs {
  cpu: string | null
  performanceScore: number | null
  ram: string | null
  storage: string | null
  display: string | null
  camera: string | null
  batteryCapacity: string | null
  batteryLife: string | null
  os: string | null
  weight: string | null
}

async function getProduct(id: string) {
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

  if (error || !product) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const common = product.specs_common as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laptop = product.specs_laptop as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartphone = product.specs_smartphone as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tablet = product.specs_tablet as any
  const specSrc = laptop ?? smartphone ?? tablet ?? {}

  let performanceScore: number | null = null
  if (common?.cpu_id) {
    const { data: cpu } = await supabase
      .from('cpus')
      .select('performance_score')
      .eq('id', common.cpu_id)
      .single()
    performanceScore = cpu?.performance_score ?? null
  }

  const displayParts = [
    specSrc.display_inch ? `${specSrc.display_inch}"` : null,
    specSrc.display_resolution ?? null,
    specSrc.display_hz ? `${specSrc.display_hz}Hz` : null,
    specSrc.display_type ?? null,
  ].filter(Boolean)

  const specs: Specs = {
    cpu: common?.cpu_name ?? null,
    performanceScore,
    ram: common?.ram_gb ? `${common.ram_gb}GB` : null,
    storage: common?.storage_gb
      ? `${common.storage_gb >= 1024 ? `${common.storage_gb / 1024}TB` : `${common.storage_gb}GB`}${common.storage_type ? ` ${common.storage_type}` : ''}`
      : null,
    display: displayParts.length ? displayParts.join(' ') : null,
    camera: smartphone?.camera_main_mp
      ? `${smartphone.camera_main_mp}MP + ${smartphone.camera_front_mp ?? '?'}MP front`
      : null,
    batteryCapacity: smartphone?.battery_mah
      ? `${smartphone.battery_mah} mAh`
      : tablet?.battery_mah
      ? `${tablet.battery_mah} mAh`
      : laptop?.battery_wh
      ? `${laptop.battery_wh} Wh`
      : null,
    batteryLife: laptop?.battery_hours ? `${laptop.battery_hours} hours` : null,
    os: common?.os ?? null,
    weight: laptop?.weight_kg
      ? `${laptop.weight_kg} kg`
      : (smartphone ?? tablet)?.weight_g
      ? `${(smartphone ?? tablet).weight_g} g`
      : null,
  }

  return { ...product, specs }
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
      <span className="text-xs text-white/30 uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/90 leading-relaxed">{value}</span>
    </div>
  )
}

export default async function ProductPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await getProduct(params.id)
  if (!product) notFound()

  const categoryLabel: Record<string, string> = {
    laptop: 'Laptop',
    smartphone: 'Smartphone',
    tablet: 'Tablet',
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-8 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            back
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-white/40 uppercase tracking-widest">{product.brand}</span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/40 uppercase tracking-widest">
                {categoryLabel[product.category] ?? product.category}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {product.price_usd && (
                <span className="text-xl font-bold text-accent">${Number(product.price_usd).toLocaleString()}</span>
              )}
              <AddToCompareButton
                product={{
                  id: product.id,
                  name: product.name,
                  brand: product.brand,
                  category: product.category,
                }}
              />
              {product.source_url && (
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  source
                </a>
              )}
            </div>
          </div>

          {/* Performance score */}
          {product.specs.performanceScore !== null && (
            <div className="mb-8 p-6 bg-surface border border-border rounded-2xl">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Performance Score</p>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-5xl font-black text-white">
                  {Math.round(product.specs.performanceScore)}
                </span>
                <span className="text-white/30 text-sm mb-1">/ 100 percentile</span>
              </div>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${product.specs.performanceScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Specs */}
          <div className="bg-surface border border-border rounded-2xl px-6 py-2">
            <SpecRow label="CPU" value={product.specs.cpu} />
            <SpecRow label="RAM" value={product.specs.ram} />
            <SpecRow label="Storage" value={product.specs.storage} />
            <SpecRow label="Display" value={product.specs.display} />
            <SpecRow label="Battery" value={product.specs.batteryCapacity} />
            <SpecRow label="Battery Life" value={product.specs.batteryLife} />
            <SpecRow label="Camera" value={product.specs.camera} />
            <SpecRow label="OS" value={product.specs.os} />
            <SpecRow label="Weight" value={product.specs.weight} />
          </div>
        </div>
      </main>
    </>
  )
}
