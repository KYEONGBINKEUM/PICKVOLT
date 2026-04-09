'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useCompareCart } from '@/lib/compareCart'

interface Specs {
  cpu:             string | null
  ram:             string | null
  storage:         string | null
  display:         string | null
  camera:          string | null
  batteryCapacity: string | null
  batteryLife:     string | null
  os:              string | null
  weight:          string | null
}

interface Product {
  id:         string
  name:       string
  brand:      string
  category:   string
  price_usd:  number | null
  image_url:  string | null
  amazon_url: string | null
  specs:      Specs
}

function SpecRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-border last:border-0">
      <span className="text-xs text-white/30 uppercase tracking-widest w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/80 leading-relaxed">{value ?? '–'}</span>
    </div>
  )
}


export default function ProductClient({ product }: { product: Product }) {
  const { t } = useI18n()
  const { cart, add, remove } = useCompareCart()
  const inCart   = cart.some((i) => i.id === product.id)
  const cartFull = cart.length >= 4

  const toggleCart = () => {
    if (inCart) remove(product.id)
    else if (!cartFull) add({ id: product.id, name: product.name, brand: product.brand, category: product.category })
  }

  const categoryLabel: Record<string, string> = {
    laptop:     'Laptop',
    smartphone: 'Smartphone',
    tablet:     'Tablet',
  }

  return (
    <>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('product.back')}
      </Link>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">

        {/* LEFT — image + header info (sticky on desktop) */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-28">

          {/* Image */}
          <div className="relative aspect-square w-full bg-surface border border-border rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-contain p-8"
                sizes="(max-width: 1024px) 100vw, 384px"
                unoptimized
              />
            ) : (
              <span className="text-6xl font-black text-white/10">{product.brand?.[0] ?? '?'}</span>
            )}
          </div>

          {/* Brand · Category */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-white/40 uppercase tracking-widest">{product.brand}</span>
            <span className="text-white/20">·</span>
            <span className="text-xs text-white/40 uppercase tracking-widest">
              {categoryLabel[product.category] ?? product.category}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-black text-white leading-tight mb-4">
            {product.name}
          </h1>

          {/* Price */}
          {product.price_usd && (
            <p className="text-2xl font-black text-accent mb-5">
              From ${Number(product.price_usd).toLocaleString()}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={toggleCart}
              disabled={!inCart && cartFull}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                inCart
                  ? 'bg-accent/15 border border-accent/40 text-accent'
                  : cartFull
                  ? 'bg-surface border border-border text-white/20 cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-light'
              }`}
            >
              {inCart
                ? <><Check className="w-4 h-4" />{t('product.in_compare')}</>
                : <><Plus className="w-4 h-4" />{t('product.add_compare')}</>
              }
            </button>

            {/* Amazon button */}
            {product.amazon_url && (
              <a
                href={product.amazon_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:brightness-105 active:scale-95 select-none"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/amazon-logo.svg" alt="Amazon" width={72} height={22} style={{ display: 'block' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '0.02em' }}>{t('compare.buy_now')}</span>
              </a>
            )}
          </div>
        </div>

        {/* RIGHT — benchmark + specs */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface border border-border rounded-2xl px-6 py-2">
            <SpecRow label={t('product.spec_cpu')}          value={product.specs.cpu} />
            <SpecRow label={t('product.spec_ram')}          value={product.specs.ram} />
            <SpecRow label={t('product.spec_storage')}      value={product.specs.storage} />
            <SpecRow label={t('product.spec_display')}      value={product.specs.display} />
            <SpecRow label={t('product.spec_battery')}      value={product.specs.batteryCapacity} />
            <SpecRow label={t('product.spec_camera')}       value={product.specs.camera} />
            <SpecRow label={t('product.spec_os')}           value={product.specs.os} />
            <SpecRow label={t('product.spec_weight')}       value={product.specs.weight} />
          </div>
        </div>
      </div>
    </>
  )
}
