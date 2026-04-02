'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SearchBar from '@/components/SearchBar'
import { useI18n } from '@/lib/i18n'
import { shortenCompareTitle } from '@/lib/utils'

interface PopularItem {
  title: string
  products: string[]
  cnt: number
}

interface TrendingItem {
  label: string
  href: string
  cnt: number
}

const FALLBACK_TRENDING: TrendingItem[] = [
  { label: 'iphone 15 vs s24', href: '/compare?q=iphone+15+vs+s24', cnt: 0 },
  { label: 'macbook m3 vs m2', href: '/compare?q=macbook+m3+vs+m2', cnt: 0 },
  { label: 'sony xm5 vs bose qc45', href: '/compare?q=sony+xm5+vs+bose+qc', cnt: 0 },
  { label: 'rtx 4080 vs 7900 xtx', href: '/compare?q=rtx+4080+vs+7900+xtx', cnt: 0 },
]

export default function HomePage() {
  const { t } = useI18n()
  const [trending, setTrending] = useState<TrendingItem[]>(FALLBACK_TRENDING)

  useEffect(() => {
    fetch('/api/compare/popular')
      .then((r) => r.json())
      .then((d: { items: PopularItem[] }) => {
        if (d.items && d.items.length >= 2) {
          setTrending(
            d.items.map((item) => ({
              label: shortenCompareTitle(item.title),
              href: `/compare?ids=${item.products.join(',')}`,
              cnt: item.cnt,
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

          {/* Trending Comparisons */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-lg font-black text-white">Trending Comparisons</h3>
              <span className="text-xs text-white/30 ml-1">this week</span>
            </div>
            <div className="space-y-2">
              {trending.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-5 py-3.5 bg-surface border border-border rounded-xl hover:border-white/15 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-white/20 font-bold w-4 flex-shrink-0">{i + 1}</span>
                    <p className="text-sm text-white/70 group-hover:text-white transition-colors truncate">{item.label}</p>
                  </div>
                  {item.cnt > 1 && (
                    <span className="flex-shrink-0 ml-3 text-xs text-white/20">{item.cnt}×</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

    </main>
  )
}
