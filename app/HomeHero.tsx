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

function formatDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

export default function HomeHero({ hero, recent }: { hero: HomeArticle; recent: HomeArticle[] }) {
  const { t } = useI18n()

  return (
    <section className="pv-hero-section" style={{ maxWidth: 1260, margin: '0 auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 20, borderBottom: '1px solid #2A2A2A' }}>
      {/* Hero lead card */}
      <Link href={`/articles/${hero.slug}`} style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }} className="pv-hero-card">
        <div style={{ aspectRatio: '16/9', background: '#1A1A1A', marginBottom: 12, overflow: 'hidden', position: 'relative' }}>
          {hero.thumbnail_url
            ? <img src={hero.thumbnail_url} alt={hero.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: '#AAAAAA' }}>이미지</span></div>
          }
        </div>
        <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#FF4D00', marginBottom: 8 }}>
          {t(CATEGORY_I18N_KEY[hero.category] ?? hero.category)}
        </span>
        <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.03em', marginBottom: 10, color: '#EDEDED', transition: 'color 0.1s' }} className="pv-hero-title">
          {hero.title}
        </h1>
        {hero.summary && <p style={{ fontSize: 15, color: '#777777', lineHeight: 1.7 }}>{hero.summary}</p>}
        <p style={{ fontSize: 13, color: '#777777', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{formatDate(hero.published_at)}</p>
      </Link>

      {/* Recent stack */}
      <div className="pv-recent-stack" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {recent.slice(0, 5).map((item) => (
          <Link
            key={item.id}
            href={`/articles/${item.slug}`}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid #2A2A2A', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            className="pv-recent-item"
          >
            <div style={{ width: 106, height: 74, flexShrink: 0, background: '#1A1A1A', overflow: 'hidden' }}>
              {item.thumbnail_url
                ? <img src={item.thumbnail_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', background: '#2A2A2A' }} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#FF4D00', marginBottom: 4 }}>
                {t(CATEGORY_I18N_KEY[item.category] ?? item.category)}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#EDEDED', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} className="pv-recent-title">
                {item.title}
              </p>
              <p style={{ fontSize: 12, color: '#777777', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{formatDate(item.published_at)}</p>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        .pv-hero-card:hover .pv-hero-title { color: #FF4D00; }
        .pv-recent-item:hover .pv-recent-title { color: #FF4D00; }
        @media (max-width: 768px) {
          .pv-hero-section { grid-template-columns: 1fr !important; padding: 14px 16px !important; }
          .pv-recent-stack { display: none !important; }
          .pv-hero-title { font-size: 22px !important; }
        }
      `}</style>
    </section>
  )
}
