'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { User, Menu, X } from 'lucide-react'
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
    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session)
      setAuthReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // 메뉴 열릴 때 스크롤 막기
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const navLinks = [
    { href: '/', label: t('nav.compare') },
    { href: '/categories/smartphone', label: t('cat.smartphone') },
    { href: '/categories/laptop',     label: t('cat.laptop')     },
    { href: '/categories/tablet',     label: t('cat.tablet')     },
    { href: '/history', label: t('nav.history') },
    { href: '/pricing', label: t('nav.pro') },
  ]

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
          <span className="font-bold text-white text-base tracking-tight">pickvolt</span>
        </Link>

        {/* Center search — desktop only */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <SearchBar />
          </div>
        )}

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'text-sm font-semibold capitalize transition-colors',
                isActive(link.href) ? 'text-white' : 'text-white/50 hover:text-white/80'
              )}
            >
              {link.label}
            </Link>
          ))}

          {authReady && (
            loggedIn ? (
              <Link href="/mypage" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
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

        {/* Mobile right side */}
        <div className="flex md:hidden items-center gap-3">
          <LocalePopup />
          {authReady && loggedIn && (
            <Link href="/mypage" className="text-white/50 hover:text-white transition-colors">
              <User className="w-4.5 h-4.5" />
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer — slides down from top */}
      <div
        className={clsx(
          'fixed top-0 left-0 right-0 z-40 md:hidden bg-background border-b border-border shadow-2xl transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        {/* drawer header (같은 높이로 맞춤) */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white text-base tracking-tight">pickvolt</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <div className="px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-colors',
                isActive(link.href)
                  ? 'bg-accent/10 text-accent'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        {authReady && (
          <div className="px-4 pb-6 pt-2 border-t border-border/50">
            {loggedIn ? (
              <Link
                href="/mypage"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User className="w-4 h-4" />
                My Page
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold bg-accent text-black hover:bg-accent/90 transition-colors"
              >
                {t('auth.signin')}
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
