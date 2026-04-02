'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import ComparisonPill from '@/components/ComparisonPill'
import { useI18n } from '@/lib/i18n'

const FALLBACK_POPULAR = [
  { label: 'iphone 15 vs s24', href: '/compare?q=iphone+15+vs+s24' },
  { label: 'macbook m3 vs m2', href: '/compare?q=macbook+m3+vs+m2' },
  { label: 'sony xm5 vs bose qc', href: '/compare?q=sony+xm5+vs+bose+qc' },
  { label: 'rtx 4080 vs 7900 xtx', href: '/compare?q=rtx+4080+vs+7900+xtx' },
]

interface PopularItem {
  title: string
  products: string[]
  cnt: number
}

export default function HomePage() {
  const { t } = useI18n()
  const [popular, setPopular] = useState<{ label: string; href: string }[]>(FALLBACK_POPULAR)

  useEffect(() => {
    fetch('/api/compare/popular')
      .then((r) => r.json())
      .then((d: { items: PopularItem[] }) => {
        if (d.items && d.items.length >= 2) {
          setPopular(
            d.items.map((item) => ({
              label: item.title.toLowerCase(),
              href: `/compare?ids=${item.products.join(',')}`,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-3xl flex flex-col items-center gap-10 animate-slide-up">
          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-black text-white text-center leading-[1.05] tracking-tight">
            {t('home.heading')}
          </h1>

          {/* Search */}
          <SearchBar />

          {/* Popular pills */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-white/30 tracking-widest uppercase">{t('home.popular')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {popular.map((p) => (
                <ComparisonPill key={p.href} label={p.label} href={p.href} />
              ))}
            </div>
          </div>
        </div>
      </div>

    </main>
  )
}
