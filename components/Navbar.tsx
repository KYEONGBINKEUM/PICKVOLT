'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { User, Menu, X, PenSquare } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { LocalePopup } from '@/components/LocaleSwitcher'
import SearchBar from '@/components/SearchBar'

interface NavbarProps {
  showSearch?: boolean
}

export default function Navbar({ showSearch }: NavbarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [loggedIn, setLoggedIn] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let settled = false
    supabase.auth.getSession().then(({ data }) => {
      settled = true
      setLoggedIn(!!data.session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!settled) return
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isCommunity = pathname.startsWith('/community')

  // 커뮤니티 섹션 우측 링크
  const communityLinks = [
    { href: '/community',         label: t('community.all'),     exact: true },
    { href: '/community/forum',   label: t('community.forum') },
    { href: '/community/reviews', label: t('community.reviews') },
    { href: '/community/free',    label: t('community.free') },
    { href: '/community/qa',      label: t('community.qa') },
  ]

  // Compare 섹션 우측 링크
  const compareLinks = [
    { href: '/categories/smartphone', label: t('cat.smartphone') },
    { href: '/categories/laptop',     label: t('cat.laptop') },
    { href: '/categories/tablet',     label: t('cat.tablet') },
    { href: '/history',               label: t('nav.history') },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md">

        {/* ── 좌측: 로고 + 메인 탭 ── */}
        <div className="flex items-center gap-1">
          <Link href={isCommunity ? "/community" : "/"} className="flex items-center gap-2 mr-4 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
            <svg viewBox="0 0 1334.13 282.17" className="h-4 w-auto" fill="white" xmlns="http://www.w3.org/2000/svg" aria-label="pickvolt">
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

          <div className="hidden md:flex items-center">
            <Link href="/"
              className={clsx(
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                !isCommunity ? 'text-white bg-white/8' : 'text-white/35 hover:text-white/70'
              )}>
              {t('nav.compare')}
            </Link>
            <Link href="/community"
              className={clsx(
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                isCommunity ? 'text-white bg-white/8' : 'text-white/35 hover:text-white/70'
              )}>
              {t('nav.community')}
            </Link>
          </div>
        </div>

        {/* ── 중앙: 검색 (Compare 섹션, showSearch 시) ── */}
        {showSearch && !isCommunity && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>
        )}

        {/* ── 우측: 섹션별 링크 + 글쓰기/유저 ── */}
        <div className="hidden md:flex items-center gap-1">
          {isCommunity ? (
            <>
              <Link href="/community/write"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-bold rounded-lg transition-colors">
                <PenSquare className="w-3.5 h-3.5" /> {t('community.write')}
              </Link>
            </>
          ) : (
            compareLinks.map(l => (
              <Link key={l.href} href={l.href}
                className={clsx(
                  'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                  isActive(l.href) ? 'text-white' : 'text-white/35 hover:text-white/70'
                )}>
                {l.label}
              </Link>
            ))
          )}

          <div className="w-px h-4 bg-border mx-2" />

          {authReady && (
            loggedIn ? (
              <Link href={isCommunity ? "/mypage?from=community" : "/mypage"} className="text-white/40 hover:text-white transition-colors p-1.5">
                <User className="w-4 h-4" />
              </Link>
            ) : (
              <Link href="/login" className="text-xs font-semibold bg-surface-2 border border-border text-white/70 hover:text-white hover:border-white/20 px-4 py-1.5 rounded-full transition-all">
                {t('auth.signin')}
              </Link>
            )
          )}
          <LocalePopup />
        </div>

        {/* ── 모바일 우측 ── */}
        <div className="flex md:hidden items-center gap-1">
          <LocalePopup />
          {authReady && loggedIn && (
            <Link href={isCommunity ? "/mypage?from=community" : "/mypage"} className="flex items-center justify-center w-9 h-9 rounded-full text-white/50 hover:text-white transition-colors">
              <User className="w-5 h-5" />
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="메뉴 열기">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* 모바일 드로어 */}
      <div className={clsx(
        'fixed top-0 left-0 right-0 z-40 md:hidden bg-background border-b border-border shadow-2xl transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-y-0' : '-translate-y-full'
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
          <Link href={isCommunity ? "/community" : "/"} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <svg viewBox="0 0 1334.13 282.17" className="h-4 w-auto" fill="white" xmlns="http://www.w3.org/2000/svg" aria-label="pickvolt">
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
          <button onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-1">
          <Link href="/" onClick={() => setMobileOpen(false)}
            className={clsx('flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors',
              !isCommunity ? 'bg-accent/10 text-accent' : 'text-white/60 hover:text-white hover:bg-white/5')}>
            {t('nav.compare')}
          </Link>
          <Link href="/community" onClick={() => setMobileOpen(false)}
            className={clsx('flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors',
              isCommunity ? 'bg-accent/10 text-accent' : 'text-white/60 hover:text-white hover:bg-white/5')}>
            {t('nav.community')}
          </Link>

          <div className="pt-2 pb-1 px-3">
            <p className="text-[10px] text-white/25 font-semibold uppercase tracking-widest">
              {isCommunity ? t('nav.community') : t('nav.compare')}
            </p>
          </div>

          {(isCommunity ? communityLinks : compareLinks).map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
              className={clsx('flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                isActive(l.href, (l as { exact?: boolean }).exact)
                  ? 'bg-white/8 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5')}>
              {l.label}
            </Link>
          ))}

          {isCommunity && (
            <Link href="/community/write" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-accent hover:bg-accent/10 transition-colors">
              <PenSquare className="w-4 h-4" /> {t('community.write')}
            </Link>
          )}
        </div>

        {authReady && (
          <div className="px-4 pb-6 pt-2 border-t border-border/50">
            {loggedIn ? (
              <Link href={isCommunity ? "/mypage?from=community" : "/mypage"} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <User className="w-4 h-4" /> {t('mypage.title')}
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-colors">
                {t('auth.signin')}
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
