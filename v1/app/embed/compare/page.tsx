import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const revalidate = 300

const BASE_URL = 'https://www.pickvolt.com'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface EmbedProduct {
  id: string
  name: string
  brand: string
  category: string
  price_usd: number | null
  image_url: string | null
  cpu_name: string | null
  ram_gb: string | null
  display_inch: number | null
  battery: string | null
  score: number | null
}

async function getProducts(ids: string[]): Promise<EmbedProduct[]> {
  if (!ids.length) return []
  const supabase = makeSupabase()

  const { data } = await supabase
    .from('products')
    .select(`
      id, name, brand, category, price_usd, image_url,
      specs_common ( cpu_name, ram_gb ),
      specs_laptop ( display_inch, battery_wh ),
      specs_smartphone ( display_inch, battery_mah ),
      specs_tablet ( display_inch, battery_mah )
    `)
    .in('id', ids)
    .eq('is_visible', true)

  if (!data) return []

  // preserve requested order
  const map = new Map(data.map((p) => [p.id, p]))
  return ids
    .map((id) => map.get(id))
    .filter(Boolean)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => {
      const common     = p.specs_common
      const laptop     = p.specs_laptop
      const smartphone = p.specs_smartphone
      const tablet     = p.specs_tablet
      const battery    = laptop?.battery_wh
        ? `${laptop.battery_wh} Wh`
        : (smartphone ?? tablet)?.battery_mah
        ? `${(smartphone ?? tablet).battery_mah} mAh`
        : null
      const display    = (laptop ?? smartphone ?? tablet)?.display_inch ?? null

      return {
        id:          p.id,
        name:        p.name,
        brand:       p.brand,
        category:    p.category,
        price_usd:   p.price_usd,
        image_url:   p.image_url,
        cpu_name:    common?.cpu_name ?? null,
        ram_gb:      common?.ram_gb   ?? null,
        display_inch: display,
        battery,
        score:       null, // keep lightweight — no scoring computation in embed
      }
    })
}

export default async function EmbedComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids } = await searchParams
  const idList = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4)
  const products = await getProducts(idList)

  const compareUrl = `${BASE_URL}/compare?ids=${idList.join(',')}`

  if (!products.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-[#0a0a0a] text-white/40 text-sm font-medium">
        No products found.
      </div>
    )
  }

  const cols = products.length

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Compare — Pickvolt</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; }
          .wrap { display: flex; flex-direction: column; min-height: 100vh; }
          .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 1px; background: #1e1e1e; flex: 1; }
          .col { background: #111; display: flex; flex-direction: column; }
          .col-head { padding: 16px 14px 12px; border-bottom: 1px solid #1e1e1e; }
          .brand { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.3); margin-bottom: 4px; }
          .name { font-size: 13px; font-weight: 800; line-height: 1.3; color: #fff; }
          .price { font-size: 12px; font-weight: 700; color: rgba(255,77,0,.9); margin-top: 6px; }
          .specs { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
          .row { display: flex; flex-direction: column; gap: 1px; }
          .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,.25); }
          .val { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.8); }
          .footer { background: #0a0a0a; border-top: 1px solid #1e1e1e; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; }
          .badge { display: flex; align-items: center; gap: 5px; text-decoration: none; }
          .dot { width: 7px; height: 7px; border-radius: 50%; background: rgb(255,77,0); flex-shrink: 0; }
          .pv { font-size: 10px; font-weight: 800; color: rgba(255,255,255,.5); }
          .cta { font-size: 10px; font-weight: 700; color: rgb(255,77,0); text-decoration: none; }
          .cta:hover { text-decoration: underline; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <div className="grid">
            {products.map((p) => (
              <div key={p.id} className="col">
                <div className="col-head">
                  <div className="brand">{p.brand}</div>
                  <div className="name">{p.name}</div>
                  {p.price_usd && <div className="price">${p.price_usd.toLocaleString()}</div>}
                </div>
                <div className="specs">
                  {p.cpu_name && (
                    <div className="row">
                      <span className="label">Processor</span>
                      <span className="val">{p.cpu_name}</span>
                    </div>
                  )}
                  {p.ram_gb && (
                    <div className="row">
                      <span className="label">RAM</span>
                      <span className="val">{p.ram_gb}GB</span>
                    </div>
                  )}
                  {p.display_inch && (
                    <div className="row">
                      <span className="label">Display</span>
                      <span className="val">{p.display_inch}&quot;</span>
                    </div>
                  )}
                  {p.battery && (
                    <div className="row">
                      <span className="label">Battery</span>
                      <span className="val">{p.battery}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="footer">
            <a href={BASE_URL} target="_blank" rel="noopener noreferrer" className="badge">
              <span className="dot" />
              <span className="pv">pickvolt</span>
            </a>
            <a href={compareUrl} target="_blank" rel="noopener noreferrer" className="cta">
              Full comparison →
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
