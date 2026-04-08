'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { Laptop, Smartphone, Tablet, Watch, Monitor } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function CategoriesPage() {
  const { t } = useI18n()

  const CATEGORIES = [
    {
      slug: 'smartphone',
      label: t('cat.smartphone'),
      sublabel: 'Smartphones',
      icon: Smartphone,
      description: t('cat.smartphone_desc'),
      color: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/20 hover:border-blue-400/40',
    },
    {
      slug: 'laptop',
      label: t('cat.laptop'),
      sublabel: 'Laptops',
      icon: Laptop,
      description: t('cat.laptop_desc'),
      color: 'from-orange-500/20 to-orange-600/5',
      border: 'border-orange-500/20 hover:border-orange-400/40',
    },
    {
      slug: 'tablet',
      label: t('cat.tablet'),
      sublabel: 'Tablets',
      icon: Tablet,
      description: t('cat.tablet_desc'),
      color: 'from-purple-500/20 to-purple-600/5',
      border: 'border-purple-500/20 hover:border-purple-400/40',
    },
    {
      slug: 'watch',
      label: t('cat.watch'),
      sublabel: 'Smartwatches',
      icon: Watch,
      description: t('cat.watch_desc'),
      color: 'from-green-500/20 to-green-600/5',
      border: 'border-green-500/20 hover:border-green-400/40',
      comingSoon: true,
    },
    {
      slug: 'monitor',
      label: t('cat.monitor'),
      sublabel: 'Monitors',
      icon: Monitor,
      description: t('cat.monitor_desc'),
      color: 'from-pink-500/20 to-pink-600/5',
      border: 'border-pink-500/20 hover:border-pink-400/40',
      comingSoon: true,
    },
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3">{t('cat.page_title')}</h1>
            <p className="text-white/40 text-base">{t('cat.page_sub')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const inner = (
                <div
                  className={`relative p-6 bg-surface border rounded-2xl transition-all duration-200 ${cat.border} group cursor-pointer`}
                >
                  {cat.comingSoon && (
                    <span className="absolute top-4 right-4 text-[10px] font-bold text-white/30 bg-surface-2 border border-border rounded-full px-2.5 py-1 uppercase tracking-widest">
                      {t('cat.coming_soon')}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} border ${cat.border} flex items-center justify-center mb-5`}>
                    <Icon className="w-6 h-6 text-white/70" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-0.5">{cat.label}</h2>
                  <p className="text-xs text-white/30 mb-3 uppercase tracking-widest">{cat.sublabel}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{cat.description}</p>
                </div>
              )

              return cat.comingSoon ? (
                <div key={cat.slug} className="opacity-50 cursor-not-allowed">
                  {inner}
                </div>
              ) : (
                <Link key={cat.slug} href={`/categories/${cat.slug}`}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
