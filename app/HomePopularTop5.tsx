'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import type { HomeArticle } from './HomeHero'

export default function HomePopularTop5({ items }: { items: HomeArticle[] }) {
  const { t } = useI18n()
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-extrabold text-white mb-4">{t('articles.popular_top5')}</h2>
      <ol className="flex flex-col divide-y divide-border rounded-card border border-border overflow-hidden">
        {items.map((item, i) => (
          <li key={item.id}>
            <Link href={`/articles/${item.slug}`} className="flex items-center gap-4 px-4 py-3.5 bg-surface hover:bg-surface-2 transition-colors">
              <span className="text-xl font-extrabold text-accent/60 w-6 flex-shrink-0">{i + 1}</span>
              <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-background">
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                )}
              </div>
              <p className="text-sm text-white/80 line-clamp-1">{item.title}</p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
