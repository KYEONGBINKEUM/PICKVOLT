'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, Flame, MessageSquare, Star, LayoutList, HelpCircle, Newspaper } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function CommunitySidebar() {
  const pathname = usePathname()
  const { t } = useI18n()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const mainLinks = [
    { href: '/community',          label: t('community.all'),     icon: Home,    exact: true },
    { href: '/community/popular',  label: t('community.popular'), icon: Flame },
  ]

  const boardLinks = [
    { href: '/community/news',    label: t('community.news'),    icon: Newspaper },
    { href: '/community/forum',   label: t('community.forum'),   icon: MessageSquare },
    { href: '/community/reviews', label: t('community.reviews'), icon: Star },
    { href: '/community/free',    label: t('community.free'),    icon: LayoutList },
    { href: '/community/qa',      label: t('community.qa'),      icon: HelpCircle },
  ]

  const allLinks = [...mainLinks, ...boardLinks]

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
          <div className="space-y-0.5 mb-4">
            {mainLinks.map(l => <NavItem key={l.href} {...l} />)}
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 mb-2">
              {t('nav.community')}
            </p>
            <div className="space-y-0.5">
              {boardLinks.map(l => <NavItem key={l.href} {...l} />)}
            </div>
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
        </div>
      </div>
    </>
  )
}
