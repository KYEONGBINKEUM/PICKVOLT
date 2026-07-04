'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'

interface RelatedItem {
  id: string
  slug: string
  title: string
  category: string
  thumbnail_url: string | null
}

export default function RelatedArticles({ items }: { items: RelatedItem[] }) {
  const { t } = useI18n()
  if (!items?.length) return null

  const [featured, ...rest] = items

  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4">{t('articles.related')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href={`/articles/${featured.slug}`} className="block rounded-card overflow-hidden bg-surface border border-border group">
          <div className="aspect-video bg-background overflow-hidden">
            {featured.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.thumbnail_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            )}
          </div>
          <div className="p-3">
            <span className="text-xs font-bold text-accent/70">{t(CATEGORY_I18N_KEY[featured.category] ?? featured.category)}</span>
            <p className="text-sm font-semibold text-white mt-1 line-clamp-2">{featured.title}</p>
          </div>
        </Link>

        <div className="flex flex-col gap-3">
          {rest.map((item) => (
            <Link key={item.id} href={`/articles/${item.slug}`} className="flex items-center gap-3 group">
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold text-accent/70">{t(CATEGORY_I18N_KEY[item.category] ?? item.category)}</span>
                <p className="text-sm text-white/80 group-hover:text-white line-clamp-2 leading-snug">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
