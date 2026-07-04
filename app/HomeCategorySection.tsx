'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'
import type { HomeArticle } from './HomeHero'

export default function HomeCategorySection({ category, items }: { category: string; items: HomeArticle[] }) {
  const { t } = useI18n()
  if (items.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-white">{t(CATEGORY_I18N_KEY[category] ?? category)}</h2>
        <Link href={`/articles/category/${category}`} className="text-xs font-semibold text-white/40 hover:text-white transition-colors">
          {t('community.more')}
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link key={item.id} href={`/articles/${item.slug}`} className="block rounded-card overflow-hidden bg-surface border border-border group">
            <div className="aspect-video bg-background overflow-hidden">
              {item.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold text-white mb-1.5 line-clamp-2 leading-snug">{item.title}</h3>
              {item.summary && <p className="text-xs text-white/40 line-clamp-2">{item.summary}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
