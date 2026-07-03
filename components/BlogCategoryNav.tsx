'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { BLOG_CATEGORIES } from '@/lib/blogCategories'

export default function BlogCategoryNav() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [visible, setVisible] = useState<Set<string> | null>(null)

  useEffect(() => {
    fetch('/api/blog-category-settings')
      .then((r) => r.json())
      .then((d) => {
        const set = new Set<string>(
          (d.settings ?? []).filter((s: { category: string; is_visible: boolean }) => s.is_visible).map((s: { category: string }) => s.category)
        )
        setVisible(set)
      })
      .catch(() => {})
  }, [])

  const categories = visible === null
    ? []
    : BLOG_CATEGORIES.filter((c) => visible.has(c.slug))

  if (categories.length === 0) return null

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border/50 px-1 -mx-1 mb-6">
      <Link
        href="/community/news"
        className={clsx(
          'flex-shrink-0 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors',
          pathname === '/community/news' ? 'text-white border-accent' : 'text-white/40 border-transparent hover:text-white/70'
        )}>
        {t('community.all')}
      </Link>
      {categories.map((c) => {
        const href = `/community/news/${c.slug}`
        const active = pathname === href
        return (
          <Link key={c.slug} href={href}
            className={clsx(
              'flex-shrink-0 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors',
              active ? 'text-white border-accent' : 'text-white/40 border-transparent hover:text-white/70'
            )}>
            {t(c.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}
