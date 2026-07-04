'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const NAV = [
  {
    labelKey: 'nav.tech',
    href: '/articles/category/tech',
    dropdown: [
      { labelKey: 'nav.tech_latest', href: '/articles/category/tech' },
      { labelKey: 'nav.mobile_wearable', href: '/articles/category/mobile' },
      { labelKey: 'nav.review', href: '/articles/category/review' },
    ],
  },
  {
    labelKey: 'nav.it',
    href: '/articles/category/it',
    dropdown: [
      { labelKey: 'nav.it_insight', href: '/articles/category/it' },
      { labelKey: 'nav.security', href: '/articles/category/security' },
      { labelKey: 'nav.startup', href: '/articles/category/startup' },
    ],
  },
  {
    labelKey: 'nav.ai_category',
    href: '/articles/category/ai',
    dropdown: [
      { labelKey: 'nav.ai_trend', href: '/articles/category/ai' },
      { labelKey: 'nav.ai_tools', href: '/articles/category/ai' },
      { labelKey: 'nav.dev_insight', href: '/articles/category/ai' },
    ],
  },
  { labelKey: 'nav.review',   href: '/articles/category/review' },
  { labelKey: 'nav.security', href: '/articles/category/security' },
  { labelKey: 'nav.startup',  href: '/articles/category/startup' },
]

const MOBILE_NAV = [
  { labelKey: 'nav.tech',        href: '/articles/category/tech' },
  { labelKey: 'nav.it',          href: '/articles/category/it' },
  { labelKey: 'nav.ai_category', href: '/articles/category/ai' },
  { labelKey: 'nav.mobile',      href: '/articles/category/mobile' },
  { labelKey: 'nav.review',      href: '/articles/category/review' },
  { labelKey: 'nav.security',    href: '/articles/category/security' },
  { labelKey: 'nav.startup',     href: '/articles/category/startup' },
]

export default function ArticleHeader() {
  const { t } = useI18n()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen])

  return (
    <>
      {/* ── Sticky site header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 200, background: '#000', borderBottom: '1px solid rgba(255,77,0,0.25)', overflow: 'visible' }}>
        {/* Scroll progress bar */}
        <div style={{ position: 'absolute', bottom: -1, left: 0, height: 1, width: `${progress}%`, background: '#FF4D00', transition: 'width 0.05s linear', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px', height: 68, display: 'flex', alignItems: 'center' }}>
          {/* Logo */}
          <Link href="/" aria-label="Pickvolt 홈" style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', flexShrink: 0, marginRight: 32, textDecoration: 'none' }}>
            Pickvolt<span style={{ color: '#FF4D00' }}>.</span>
          </Link>

          {/* Desktop nav */}
          <nav className="pv-site-nav" style={{ display: 'flex', alignItems: 'stretch' }} aria-label={t('header.menu_aria')}>
            {NAV.map((item) => (
              <div key={item.labelKey} className="pv-nav-group" style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
                <Link
                  href={item.href}
                  className="pv-nav-link"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px', height: 68, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none', transition: 'color 0.12s' }}
                >
                  {t(item.labelKey)}
                  {item.dropdown && (
                    <svg className="pv-nav-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transition: 'transform 0.15s' }}>
                      <polyline points="1 1 5 5 9 1" />
                    </svg>
                  )}
                </Link>

                {item.dropdown && (
                  <div className="pv-dropdown" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: '#111', minWidth: 160, borderTop: '2px solid #FF4D00', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', display: 'none', flexDirection: 'column' }}>
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.labelKey + sub.href}
                        href={sub.href}
                        style={{ padding: '11px 16px', fontSize: 14, color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap', textDecoration: 'none', display: 'block', transition: 'color 0.1s' }}
                      >
                        {t(sub.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label={t('header.search_aria')}
              style={{ color: 'rgba(255,255,255,0.65)', padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <circle cx="9" cy="9" r="5.5" /><line x1="13.5" y1="13.5" x2="17" y2="17" />
              </svg>
            </button>
            <button
              className="pv-btn-ham"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={t('header.menu_aria')}
              style={{ color: 'rgba(255,255,255,0.75)', padding: 7, background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <line x1="2" y1="5" x2="18" y2="5" /><line x1="2" y1="10" x2="18" y2="10" /><line x1="2" y1="15" x2="18" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav style={{ background: '#111' }} aria-label="모바일 메뉴">
            {MOBILE_NAV.map((item) => (
              <Link
                key={item.labelKey}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{ color: 'rgba(255,255,255,0.75)', padding: '12px 20px', fontSize: 15, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'block', textDecoration: 'none' }}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* ── Header ad bar — NOT sticky, scrolls away ── */}
      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', padding: '6px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ height: 60, width: '100%', maxWidth: 728, background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>{t('ads.label')}</span>
          <span style={{ fontSize: 11, color: '#CCCCCC' }}>728×90</span>
        </div>
      </div>

      {/* ── Search overlay ── */}
      {searchOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-start', paddingTop: 80, justifyContent: 'center' }}
        >
          <div style={{ background: '#0E0E0E', border: '1px solid #2A2A2A', width: 600, maxWidth: '92vw', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 12, borderBottom: '1px solid #2A2A2A' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#777" strokeWidth="1.75" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="5.5" /><line x1="13.5" y1="13.5" x2="17" y2="17" />
              </svg>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('header.search_placeholder')}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 18, fontFamily: 'inherit', color: '#EDEDED', background: 'transparent' }}
              />
              <button onClick={() => setSearchOpen(false)} style={{ color: '#777', cursor: 'pointer', background: 'none', border: 'none', padding: 3 }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" />
                </svg>
              </button>
            </div>
            <p style={{ padding: '14px 20px', fontSize: 14, color: '#777' }}>{t('header.search_hint')}</p>
          </div>
        </div>
      )}
    </>
  )
}
