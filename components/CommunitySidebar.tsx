'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, Flame, Newspaper, Users, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'
import TechEventsWidget from '@/components/TechEventsWidget'

let clansCache: { data: { id: string; slug: string; name: string; avatar_url?: string | null }[]; ts: number } | null = null
const CLANS_TTL = 30000 // 30 seconds

export default function CommunitySidebar() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [myClans, setMyClans] = useState<{ id: string; slug: string; name: string; avatar_url?: string | null }[]>([])
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
            {myClans.map(c => {
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
            })}
            <Link href="/clan"
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
                pathname === '/clan' ? 'bg-white/10 text-white font-semibold' : 'text-white/30 hover:text-white hover:bg-white/5'
              )}>
              <Users className="w-4 h-4 flex-shrink-0" />
              {t('clan.discover')}
            </Link>
          </div>

          {/* 테크 이벤트 캘린더 */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <TechEventsWidget />
          </div>

        </div>
      </aside>

    </>
  )
}
