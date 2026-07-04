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
          <Link href="/" aria-label="Pickvolt 홈" style={{ flexShrink: 0, marginRight: 32, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 1334.13 282.17" style={{ height: 18, width: 'auto' }} fill="white" xmlns="http://www.w3.org/2000/svg" aria-label="pickvolt">
              <path d="M187.05,57.78c-7.39-13.39-18.12-23.89-32.18-31.49c-14.06-7.6-31.12-11.39-51.19-11.37L0.78,15.03l0.28,263.88l54.02-0.06l-0.09-86.25l47.64-0.05c20.31-0.02,37.57-3.79,51.79-11.3c14.22-7.51,25.07-17.91,32.55-31.2c7.48-13.29,11.22-28.67,11.2-46.15C198.15,86.55,194.44,71.18,187.05,57.78z M137.18,127.35c-3.48,6.73-8.78,12.02-15.92,15.87c-7.14,3.85-16.26,5.77-27.36,5.78l-38.96,0.04l-0.09-89.44l38.79-0.04c11.1-0.01,20.25,1.84,27.46,5.55c7.2,3.71,12.55,8.9,16.04,15.57c3.49,6.67,5.24,14.43,5.25,23.28C142.39,112.82,140.65,120.62,137.18,127.35z"/>
              <path d="M252.1,54.79c-8.03,0.01-14.88-2.64-20.55-7.95c-5.67-5.31-8.51-11.74-8.52-19.3c-0.01-7.55,2.82-13.99,8.48-19.31s12.5-7.98,20.54-7.99c8.03-0.01,14.91,2.64,20.64,7.95c5.73,5.31,8.6,11.74,8.61,19.3c0.01,7.56-2.85,13.99-8.57,19.31C267,52.12,260.13,54.79,252.1,54.79z M225.77,278.68l-0.21-198l53.13-0.06l0.21,198L225.77,278.68z"/>
              <path d="M403.55,282.39c-19.95,0.02-37.17-4.24-51.64-12.79c-14.47-8.54-25.64-20.46-33.51-35.74c-7.87-15.28-11.81-33.08-11.83-53.38c-0.02-20.54,3.88-38.46,11.72-53.76c7.83-15.3,18.98-27.23,33.44-35.81c14.45-8.57,31.66-12.87,51.61-12.89c11.69-0.01,22.49,1.51,32.42,4.57c9.92,3.06,18.72,7.42,26.4,13.08c7.68,5.66,14,12.56,18.97,20.7c4.97,8.14,8.4,17.29,10.3,27.44l-49.4,9.26c-1.07-5.19-2.73-9.83-4.97-13.9c-2.25-4.07-4.97-7.55-8.16-10.44c-3.19-2.89-6.88-5.1-11.08-6.63c-4.19-1.53-8.83-2.29-13.9-2.29c-9.45,0.01-17.38,2.56-23.81,7.64c-6.43,5.08-11.26,12.17-14.5,21.27c-3.24,9.1-4.85,19.61-4.84,31.53c0.01,11.69,1.65,22.08,4.9,31.17c3.26,9.09,8.1,16.23,14.54,21.41c6.44,5.19,14.38,7.78,23.83,7.77c5.07,0,9.74-0.81,13.99-2.41c4.25-1.6,8.02-3.91,11.33-6.92c3.3-3.01,6.07-6.65,8.31-10.9c2.24-4.25,3.83-9.04,4.77-14.35l49.42,8.98c-1.88,10.51-5.29,19.87-10.24,28.08c-4.95,8.21-11.26,15.27-18.93,21.18c-7.67,5.91-16.49,10.41-26.46,13.49C426.24,280.83,415.35,282.38,403.55,282.39z"/>
              <polygon points="642.95,278.25 705.47,278.18 627.6,166.25 701.54,80.18 640.09,80.25 575.35,156.47 572.33,156.47 572.19,14.44 519.06,14.49 519.33,278.38 572.46,278.32 572.4,214.82 587.57,197.67"/>
              <path d="M853.99,80.02l-32.83,102.75c-4,12.88-7.47,25.87-10.41,38.97c-1.14,5.07-2.29,10.24-3.44,15.45c-1.2-5.21-2.39-10.37-3.56-15.44c-3.02-13.1-6.55-26.09-10.58-38.95l-33.4-102.69l-56.5,0.06l73.17,197.93l60.39-0.06l72.94-198.08L853.99,80.02z"/>
              <path d="M1010.55,281.76c-19.83,0.02-37.02-4.24-51.55-12.79c-14.53-8.54-25.73-20.46-33.6-35.74c-7.87-15.28-11.81-33.08-11.83-53.38c-0.02-20.54,3.88-38.46,11.72-53.76c7.83-15.3,19.01-27.23,33.52-35.81c14.51-8.57,31.69-12.87,51.52-12.89c19.95-0.02,37.17,4.24,51.64,12.79c14.47,8.55,25.64,20.46,33.51,35.74c7.87,15.28,11.81,33.19,11.83,53.74c0.02,20.31-3.89,38.11-11.72,53.41c-7.84,15.3-18.98,27.24-33.44,35.81C1047.71,277.44,1030.5,281.74,1010.55,281.76z M1010.51,239.96c9.45-0.01,17.35-2.64,23.72-7.91c6.37-5.26,11.14-12.47,14.32-21.62c3.18-9.15,4.76-19.46,4.75-30.91c-0.01-11.69-1.62-22.08-4.81-31.17c-3.2-9.09-7.99-16.22-14.37-21.41c-6.38-5.19-14.29-7.78-23.74-7.77c-9.45,0.01-17.33,2.62-23.63,7.82c-6.31,5.2-11.06,12.35-14.23,21.44c-3.18,9.1-4.76,19.49-4.75,31.18c0.01,11.45,1.62,21.75,4.81,30.9c3.2,9.15,7.96,16.35,14.28,21.59C993.18,237.35,1001.06,239.97,1010.51,239.96z"/>
              <path d="M1188.22,13.79l0.28,263.88l-53.13,0.05l-0.28-263.88L1188.22,13.79z"/>
              <path d="M1326.03,235.74c-1.89,0.48-4.66,0.98-8.32,1.51c-3.66,0.54-6.49,0.8-8.5,0.81c-6.5,0.01-11.13-1.49-13.91-4.5c-2.78-3.01-4.17-7.64-4.18-13.9l-0.1-99.53l37.01-0.04l-0.04-40.56l-37.02,0.04l-0.05-47.11l-53.13,0.06l0.05,47.11l-27.27,0.03l0.04,40.56l27.27-0.03l0.11,104.14c0.02,18.07,5.29,31.93,15.81,41.6c10.52,9.67,25.69,14.5,45.53,14.47c5.31-0.01,10.89-0.37,16.74-1.08c5.84-0.71,11.71-1.96,17.62-3.74L1326.03,235.74z"/>
            </svg>
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

      {/* ── Header ad bar — uncomment when AdSense is approved ──
      <div style={{ background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', padding: '6px 20px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ height: 60, width: '100%', maxWidth: 728, background: '#1A1A1A', border: '1px dashed #2A2A2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#BBBBBB' }}>{t('ads.label')}</span>
          <span style={{ fontSize: 11, color: '#CCCCCC' }}>728×90</span>
        </div>
      </div>
      ── */}

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
