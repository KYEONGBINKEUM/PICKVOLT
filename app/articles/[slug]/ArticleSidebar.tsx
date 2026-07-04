'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import AdSlot from '@/components/articles/AdSlot'

interface TocItem { id: string; text: string }
interface PopularItem { id: string; slug: string; title: string; thumbnail_url: string | null }

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
    <aside className="hidden lg:block">
      <div className="sticky top-24 flex flex-col gap-5">
        {toc.length > 0 && (
          <div className="p-4 rounded-card bg-surface border border-border">
            <h3 className="text-xs font-bold text-white/50 mb-2">{t('articles.toc')}</h3>
            <ul className="flex flex-col gap-1.5">
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => scrollTo(item.id, e)}
                    className={`block text-sm truncate transition-colors ${activeId === item.id ? 'text-accent font-semibold' : 'text-white/50 hover:text-white'}`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AdSlot variant="sidebar" />

        {popular.length > 0 && (
          <div className="p-4 rounded-card bg-surface border border-border">
            <h3 className="text-xs font-bold text-white/50 mb-3">{t('articles.popular_posts')}</h3>
            <ul className="flex flex-col gap-3">
              {popular.map((p) => (
                <li key={p.id}>
                  <Link href={`/articles/${p.slug}`} className="flex items-center gap-2.5 group">
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-background">
                      {p.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="text-sm text-white/70 group-hover:text-white line-clamp-2 leading-snug">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AdSlot variant="sidebar" />
      </div>
    </aside>
  )
}
