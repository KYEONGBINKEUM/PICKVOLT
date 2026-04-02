'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import { LocalePopup } from '@/components/LocaleSwitcher'

interface NavbarProps {
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (v: string) => void
  onSearchSubmit?: (v: string) => void
  searchPlaceholder?: string
}

export default function Navbar({ showSearch, searchValue, onSearchChange, onSearchSubmit, searchPlaceholder }: NavbarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navLinks = [
    { href: '/compare', label: t('nav.compare') },
    { href: '/history', label: t('nav.history') },
    { href: '/pricing', label: t('nav.pro') },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse-dot" />
        <span className="font-bold text-white text-base tracking-tight">pickvolt</span>
      </Link>

      {/* Center search */}
      {showSearch && (
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <input
            type="text"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue?.trim()) {
                onSearchSubmit?.(searchValue.trim())
              }
            }}
            placeholder={searchPlaceholder ?? 'search for products or specs...'}
            className="w-full bg-surface-2 border border-border rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      )}

      {/* Nav links */}
      <div className="flex items-center gap-5">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'text-sm transition-colors hidden md:block',
              pathname === link.href
                ? 'text-white font-semibold'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            {link.label}
          </Link>
        ))}

        {/* Auth */}
        {loggedIn ? (
          <Link
            href="/mypage"
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <User className="w-4 h-4" />
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold bg-surface-2 border border-border text-white/70 hover:text-white hover:border-white/20 px-4 py-1.5 rounded-full transition-all"
          >
            {t('auth.signin')}
          </Link>
        )}

        {/* Language & Currency */}
        <LocalePopup />
      </div>
    </nav>
  )
}
