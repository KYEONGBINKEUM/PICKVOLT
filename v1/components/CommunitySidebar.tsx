'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Home, Newspaper } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export default function CommunitySidebar() {
  const pathname = usePathname()
  const { t } = useI18n()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  const allLinks = [
    { href: '/community',      label: t('community.all'),  icon: Home,      exact: true },
    { href: '/community/news', label: t('community.news'), icon: Newspaper },
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
    <aside className="hidden md:flex fixed left-0 top-[65px] w-52 h-[calc(100vh-65px)] border-r border-border/40 bg-background flex-col z-30 overflow-y-auto">
      <div className="py-3 px-2">
        <div className="space-y-0.5">
          {allLinks.map(l => <NavItem key={l.href} {...l} />)}
        </div>
      </div>
    </aside>
  )
}
