'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, Flame, Newspaper, Users, Plus, Search, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

let clansCache: { data: { id: string; slug: string; name: string; avatar_url?: string | null }[]; ts: number } | null = null
const CLANS_TTL = 30000 // 30 seconds

export default function CommunitySidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [myClans, setMyClans] = useState<{ id: string; slug: string; name: string; avatar_url?: string | null }[]>([])
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<{ posts: {id:string;type:string;title:string}[]; clans: {id:string;slug:string;name:string;avatar_url:string|null}[] } | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (clansCache && Date.now() - clansCache.ts < CLANS_TTL) {
      setMyClans(clansCache.data)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token
      if (!token) return
      fetch('/api/clans?my=1', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const list = d.clans ?? []
          clansCache = { data: list, ts: Date.now() }
          setMyClans(list)
        })
        .catch(() => {})
    })
  }, [])

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes(null); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(searchQ)}`)
        if (r.ok) setSearchRes(await r.json())
      } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQ])

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const allLinks = [
    { href: '/community',         label: t('community.all'),     icon: Home,      exact: true },
    { href: '/community/popular', label: t('community.popular'), icon: Flame },
    { href: '/community/news',    label: t('community.news'),    icon: Newspaper },
  ]

  const NavItem = ({ href, label, icon: Icon, exact }: {
    href: string; label: string; icon: React.ElementType; exact?: boolean
  }) => {
    const active = isActive(href, exact)
    return (
      <Link href={href}
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
          active
            ? 'bg-white/10 text-white font-semibold'
            : 'text-white/50 hover:text-white hover:bg-white/5'
        )}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* PC 사이드바 */}
      <aside className="hidden md:flex fixed left-0 top-[65px] w-52 h-[calc(100vh-65px)] border-r border-border/40 bg-background flex-col z-30 overflow-y-auto">
        <div className="py-3 px-2">

          {/* 검색 */}
          <div className="relative mb-3 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder={t('search.community_placeholder')}
                className="w-full bg-surface border border-border rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
              />
              {searchQ && (
                <button onClick={() => { setSearchQ(''); setSearchRes(null) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Results dropdown */}
            {(searchRes || searching) && searchQ && (
              <div className="absolute left-1 right-1 top-full mt-1 bg-background border border-border rounded-xl overflow-hidden z-50 shadow-2xl max-h-72 overflow-y-auto">
                {searching && <div className="px-3 py-3 text-xs text-white/30">{t('search.searching') ?? '...'}</div>}
                {searchRes && !searching && searchRes.clans.length === 0 && searchRes.posts.length === 0 && (
                  <div className="px-3 py-3 text-xs text-white/30">{t('search.no_results')}</div>
                )}
                {searchRes && searchRes.clans.length > 0 && (
                  <>
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-white/25 uppercase tracking-widest">{t('clan.title')}</p>
                    {searchRes.clans.map(c => (
                      <Link key={c.id} href={`/clan/${c.slug}`} onClick={() => { setSearchQ(''); setSearchRes(null) }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors">
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          : <span className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent/70 flex-shrink-0">{c.name[0]?.toUpperCase()}</span>
                        }
                        <span className="text-xs text-white/70 truncate">{c.name}</span>
                      </Link>
                    ))}
                  </>
                )}
                {searchRes && searchRes.posts.length > 0 && (
                  <>
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-white/25 uppercase tracking-widest">{t('community.all')}</p>
                    {searchRes.posts.map(p => (
                      <Link key={p.id} href={`/community/posts/${p.id}`} onClick={() => { setSearchQ(''); setSearchRes(null) }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-accent/60 font-bold uppercase flex-shrink-0">{p.type}</span>
                        <span className="text-xs text-white/70 truncate">{p.title}</span>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            {allLinks.map(l => <NavItem key={l.href} {...l} />)}
          </div>

          {/* 클랜 섹션 */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('clan.my_clans')}</span>
              <Link href="/clan/create" className="text-white/30 hover:text-accent transition-colors" title={t('clan.create')}>
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>
            {myClans.length === 0 ? (
              <Link href="/clan"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white hover:bg-white/5 transition-colors w-full">
                <Users className="w-4 h-4 flex-shrink-0" />
                {t('clan.discover')}
              </Link>
            ) : (
              myClans.map(c => {
                const active = pathname === `/clan/${c.slug}` || pathname.startsWith(`/clan/${c.slug}/`)
                return (
                  <Link key={c.id} href={`/clan/${c.slug}`}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
                      active ? 'bg-white/10 text-white font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
                    )}>
                    {c.avatar_url
                      ? <img src={c.avatar_url} alt={c.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                      : <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent/70 flex-shrink-0">{c.name[0]?.toUpperCase()}</span>
                    }
                    <span className="truncate">{c.name}</span>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </aside>

      {/* 모바일 가로 스크롤 탭바 */}
      <div className="md:hidden fixed top-[57px] left-0 right-0 z-30 bg-background border-b border-border/40 overflow-x-auto">
        <div className="flex items-center gap-1 px-3 py-2 min-w-max">
          {allLinks.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link key={href} href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  active
                    ? 'bg-white/12 text-white font-semibold'
                    : 'text-white/45 hover:text-white hover:bg-white/5'
                )}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
          {myClans.map(c => {
            const active = pathname === `/clan/${c.slug}` || pathname.startsWith(`/clan/${c.slug}/`)
            return (
              <Link key={c.id} href={`/clan/${c.slug}`}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0',
                  active ? 'bg-white/12 text-white font-semibold' : 'text-white/45 hover:text-white hover:bg-white/5'
                )}>
                {c.avatar_url
                  ? <img src={c.avatar_url} alt={c.name} className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0" />
                  : <span className="w-3.5 h-3.5 rounded-full bg-accent/20 flex items-center justify-center text-[7px] font-bold text-accent/70 flex-shrink-0">{c.name[0]?.toUpperCase()}</span>
                }
                {c.name}
              </Link>
            )
          })}
          <Link href="/clan"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/35 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap flex-shrink-0">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            {t('clan.title')}
          </Link>
        </div>
      </div>
    </>
  )
}
