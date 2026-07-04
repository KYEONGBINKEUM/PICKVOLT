'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'

export interface HomeArticle {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  thumbnail_url: string | null
  published_at: string | null
}

export default function HomeHero({ hero, recent }: { hero: HomeArticle; recent: HomeArticle[] }) {
  const { t } = useI18n()
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      <Link href={`/articles/${hero.slug}`} className="block rounded-card overflow-hidden bg-surface border border-border group">
        <div className="aspect-[16/9] bg-background overflow-hidden">
          {hero.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.thumbnail_url} alt={hero.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
          )}
        </div>
        <div className="p-5">
          <span className="text-xs font-bold text-accent/70">{t(CATEGORY_I18N_KEY[hero.category] ?? hero.category)}</span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2 mb-2 leading-snug">{hero.title}</h1>
          {hero.summary && <p className="text-sm text-white/50 line-clamp-2">{hero.summary}</p>}
        </div>
      </Link>

      <div className="flex flex-col gap-3">
        {recent.map((item) => (
          <Link key={item.id} href={`/articles/${item.slug}`} className="flex items-center gap-3 group">
            <div className="w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
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
    </section>
  )
}
