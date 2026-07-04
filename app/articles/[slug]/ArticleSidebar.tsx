'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'

interface TocItem { id: string; text: string }
interface PopularItem { id: string; slug: string; title: string; category: string; thumbnail_url: string | null; published_at: string | null }

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10).replace(/-/g, '.')
}

export default function ArticleSidebar({ contentHtml }: { contentHtml: string }) {
  const { t } = useI18n()
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [popular, setPopular] = useState<PopularItem[]>([])

  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>('#article-content h2'))
    const items: TocItem[] = headings.map((h, i) => {
      if (!h.id) h.id = `sec-${i}`
      return { id: h.id, text: h.textContent ?? '' }
    })
    setToc(items)

    if (headings.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-10% 0px -75% 0px', threshold: 0 }
    )
    headings.forEach((h) => obs.observe(h))
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentHtml])

  useEffect(() => {
    fetch('/api/articles/popular?limit=3')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPopular(d?.items ?? []))
      .catch(() => {})
  }, [])

  const scrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 88
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <aside style={{ minWidth: 0 }} className="pv-sidebar-hide">
      <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* TOC */}
        {toc.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '14px 16px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#777777', marginBottom: 8 }}>
              {t('articles.toc')}
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => scrollTo(item.id, e)}
                    style={{
                      display: 'block', fontSize: 14, color: activeId === item.id ? '#FF4D00' : '#777777',
                      padding: '4px 8px', borderLeft: `2px solid ${activeId === item.id ? '#FF4D00' : 'transparent'}`,
                      lineHeight: 1.4, fontWeight: activeId === item.id ? 600 : 400, transition: 'color 0.1s',
                    }}
                    className="pv-toc-link"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sidebar Ad 1 — uncomment when AdSense is approved
        <div style={{ height: 250, width: '100%', background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>광고</span>
          <span style={{ fontSize: 11, color: '#CCCCCC' }}>300×250</span>
        </div>
        */}

        {/* Popular 3 */}
        {popular.length > 0 && (
          <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', padding: '14px 16px' }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#777777', marginBottom: 10 }}>
              {t('articles.popular_posts')}
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {popular.map((p) => (
                <li key={p.id}>
                  <Link href={`/articles/${p.slug}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'inherit' }} className="pv-pop-link">
                    <div style={{ width: 64, height: 48, flexShrink: 0, overflow: 'hidden', background: '#2A2A2A' }}>
                      {p.thumbnail_url
                        ? <img src={p.thumbnail_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#2A2A2A' }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#FF4D00', letterSpacing: '0.04em' }}>
                        {t(CATEGORY_I18N_KEY[p.category] ?? p.category)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#EDEDED', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', transition: 'color 0.1s' }} className="pv-pop-title">
                        {p.title}
                      </span>
                      <span style={{ fontSize: 11, color: '#777777' }}>{formatDate(p.published_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sidebar Ad 2 — uncomment when AdSense is approved
        <div style={{ height: 250, width: '100%', background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>광고</span>
          <span style={{ fontSize: 11, color: '#CCCCCC' }}>300×250</span>
        </div>
        */}
      </div>

      <style>{`
        .pv-toc-link:hover { color: #EDEDED !important; }
        .pv-pop-link:hover .pv-pop-title { color: #FF4D00; }
        @media (max-width: 1024px) { .pv-sidebar-hide { display: none !important; } }
      `}</style>
    </aside>
  )
}
