'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'
import type { HomeArticle } from './HomeHero'

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

export default function HomePopularTop5({ items }: { items: HomeArticle[] }) {
  const { t } = useI18n()
  if (items.length === 0) return null

  return (
    <section style={{ maxWidth: 1260, margin: '0 auto', padding: '22px 20px 0' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #EDEDED' }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: '#EDEDED' }}>{t('articles.popular_top5')}</h2>
      </div>

      {/* Ranked list */}
      <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', borderTop: '1px solid #2A2A2A' }}>
        {items.map((item, i) => (
          <li key={item.id}>
            <Link
              href={`/articles/${item.slug}`}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 6px', borderBottom: '1px solid #2A2A2A', cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'background 0.1s' }}
              className="pv-popular-item"
            >
              {/* Rank number — top 3 in accent, rest in gray */}
              <span style={{ fontSize: 22, fontWeight: 800, color: i < 3 ? '#FF4D00' : '#D0D0D0', minWidth: 32, lineHeight: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
                {i + 1}
              </span>

              {/* Thumbnail */}
              <div style={{ width: 106, height: 72, flexShrink: 0, background: '#1A1A1A', overflow: 'hidden' }} className="pv-pop-thumb">
                {item.thumbnail_url
                  ? <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#2A2A2A' }} />
                }
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: '#777777', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {t(CATEGORY_I18N_KEY[item.category] ?? item.category)} · {formatDate(item.published_at)}
                </p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#EDEDED', lineHeight: 1.5, transition: 'color 0.1s' }} className="pv-pop-title">
                  {item.title}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <style>{`
        .pv-popular-item:hover { background: #1A1A1A; }
        .pv-popular-item:hover .pv-pop-title { color: #FF4D00; }
        @media (max-width: 520px) {
          .pv-pop-thumb { display: none !important; }
        }
      `}</style>
    </section>
  )
}
