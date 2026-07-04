'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useI18n } from '@/lib/i18n'
import { LocalePopup } from '@/components/LocaleSwitcher'
import AdSlot from '@/components/articles/AdSlot'
import { ARTICLE_CATEGORIES, CATEGORY_I18N_KEY } from '@/lib/articleCategories'

const CATEGORIES = ARTICLE_CATEGORIES.map((slug) => ({ slug, key: CATEGORY_I18N_KEY[slug] }))

export default function ArticleHeader() {
  const { t } = useI18n()
  const pathname = usePathname()
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
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const isActiveCategory = (slug: string) => pathname === `/articles/category/${slug}`

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="h-0.5 bg-accent transition-all duration-150" style={{ width: `${progress}%` }} />
        <div className="max-w-inner mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-lg font-extrabold tracking-tight text-white">Pickvolt</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="categories">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/articles/category/${c.slug}`}
                className={clsx(
                  'px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                  isActiveCategory(c.slug) ? 'text-white bg-white/8' : 'text-white/40 hover:text-white'
                )}
              >
                {t(c.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              aria-label={t('header.search_aria')}
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
            <LocalePopup />
            <button
              aria-label={t('header.menu_aria')}
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden border-t border-border px-4 py-3 grid grid-cols-2 gap-1" aria-label="categories mobile">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/articles/category/${c.slug}`}
                className={clsx(
                  'px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                  isActiveCategory(c.slug) ? 'bg-white/8 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                {t(c.key)}
              </Link>
            ))}
          </nav>
        )}

        <div className="max-w-inner mx-auto px-4 sm:px-6 py-2">
          <AdSlot variant="leaderboard" />
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false) }}
        >
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl p-4">
            <form onSubmit={submitSearch} className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
              <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('header.search_placeholder')}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
              />
              <button
                type="button"
                aria-label={t('header.menu_aria')}
                onClick={() => setSearchOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-2 text-xs text-white/30">{t('header.search_hint')}</p>
          </div>
        </div>
      )}
    </>
  )
}
