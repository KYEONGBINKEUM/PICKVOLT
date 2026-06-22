'use client'

import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

interface Product {
  id: string
  name: string
  brand: string
  image_url: string | null
}

interface TrendingCard {
  productA: Product
  productB: Product
  href: string
  cnt: number
  verdict: string | null
  verdictCount: number
}

function ProductThumb({ product }: { product: Product }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="w-20 h-20 rounded-xl bg-surface-2 flex items-center justify-center overflow-hidden flex-shrink-0">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl(product.image_url, 160)} alt={product.name} className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-2xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
        )}
      </div>
      <p className="text-xs text-white/55 text-center line-clamp-2 leading-tight w-full px-1">
        {product.name}
      </p>
    </div>
  )
}

export default function TrendingSection({ items }: { items: TrendingCard[] }) {
  const { t } = useI18n()

  const CARD_W = 260
  const GAP    = 16
  const SLOT   = CARD_W + GAP
  const doubled  = [...items, ...items]
  const duration = items.length * 4

  if (items.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="text-lg font-black text-white">{t('compare.trending')}</h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">
          {t('compare.trending_sub')}
        </span>
      </div>
      <div
        className="overflow-hidden w-full"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-${items.length * SLOT}px); }
          }
          .marquee-track { animation: marquee ${duration}s linear infinite; }
          .marquee-track:hover { animation-play-state: paused; }
        `}</style>
        <div className="marquee-track flex" style={{ width: `${doubled.length * SLOT}px` }}>
          {doubled.map((item, i) => (
            <div key={i} className="flex-shrink-0" style={{ width: CARD_W, marginRight: GAP }}>
              <Link
                href={item.href}
                className="block bg-surface border border-border rounded-2xl px-4 pt-4 pb-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ProductThumb product={item.productA} />
                  <span className="flex-shrink-0 text-xs font-black text-white/20 px-1">vs</span>
                  <ProductThumb product={item.productB} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
