'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'
import type { HomeArticle } from './HomeHero'

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

export default function HomeCategorySection({ category, items }: { category: string; items: HomeArticle[] }) {
  const { t } = useI18n()
  if (items.length === 0) return null

  const label = t(CATEGORY_I18N_KEY[category] ?? category)

  return (
    <section style={{ maxWidth: 1260, margin: '0 auto', padding: '22px 20px 0' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #EDEDED' }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: '#EDEDED' }}>{label}</h2>
        <Link href={`/articles/category/${category}`} style={{ fontSize: 13, color: '#777777', textDecoration: 'none', transition: 'color 0.1s' }} className="pv-sec-more">
          {t('articles.view_all')} ›
        </Link>
      </div>

      {/* 4-column article grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/articles/${item.slug}`}
            style={{ position: 'relative', cursor: 'pointer', borderBottom: '1px solid #2A2A2A', paddingBottom: 14, display: 'block', textDecoration: 'none', color: 'inherit' }}
            className="pv-art-card"
          >
            {/* Thumbnail */}
            <div style={{ aspectRatio: '16/9', background: '#1A1A1A', marginBottom: 10, overflow: 'hidden' }}>
              {item.thumbnail_url
                ? <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', background: '#2A2A2A' }} />
              }
            </div>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#FF4D00', marginBottom: 5 }}>
              {t(CATEGORY_I18N_KEY[item.category] ?? item.category)}
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.45, color: '#EDEDED', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', transition: 'color 0.1s' }} className="pv-art-title">
              {item.title}
            </h3>
            {item.summary && (
              <p style={{ fontSize: 14, color: '#777777', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {item.summary}
              </p>
            )}
            <p style={{ fontSize: 12, color: '#777777', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{formatDate(item.published_at)}</p>
          </Link>
        ))}
      </div>

      <style>{`
        .pv-art-card:hover .pv-art-title { color: #FF4D00; }
        .pv-sec-more:hover { color: #FF4D00; }
        @media (max-width: 1024px) {
          .pv-cat-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .pv-cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .pv-cat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
