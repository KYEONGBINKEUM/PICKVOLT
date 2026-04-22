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
    { href: '/community/forum',   label: t('community.forum') },
    { href: '/community/reviews', label: t('community.reviews') },
    { href: '/community',         label: t('community.all'), exact: true },
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
          <Link href="/" className="flex items-center gap-2 mr-4 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-bold text-white text-base tracking-tight">pickvolt</span>
          </Link>

          <div className="hidden md:flex items-center">
            <Link href="/"
              className={clsx(
                'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                !isCommunity ? 'text-white bg-white/8' : 'text-white/35 hover:text-white/70'
              )}>
              Compare
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
              <Link href="/mypage" className="text-white/40 hover:text-white transition-colors p-1.5">
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
        <div className="flex md:hidden items-center gap-3">
          <LocalePopup />
          {authReady && loggedIn && (
            <Link href="/mypage" className="text-white/50 hover:text-white transition-colors">
              <User className="w-4 h-4" />
            </Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
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
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white text-base tracking-tight">pickvolt</span>
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
            Compare
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
              <PenSquare className="w-4 h-4" /> 글쓰기
            </Link>
          )}
        </div>

        {authReady && (
          <div className="px-4 pb-6 pt-2 border-t border-border/50">
            {loggedIn ? (
              <Link href="/mypage" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                <User className="w-4 h-4" /> My Page
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
