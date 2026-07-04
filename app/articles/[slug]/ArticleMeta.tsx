'use client'

import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'

export function CategoryBadge({ category }: { category: string }) {
  const { t } = useI18n()
  return (
    <span className="inline-block text-xs font-bold text-accent/70 mb-2">
      {t(CATEGORY_I18N_KEY[category] ?? category)}
    </span>
  )
}

export function ArticleMetaLine({
  publishedAt, updatedAt, authorName, readMinutes,
}: { publishedAt: string; updatedAt: string; authorName: string; readMinutes: number }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40 mb-4">
      <span>{t('articles.published_label')} {publishedAt}</span>
      <span>·</span>
      <span>{t('articles.updated_label')} {updatedAt}</span>
      {authorName && (<><span>·</span><span>{authorName}</span></>)}
      <span>·</span>
      <span>{t('articles.read_minutes').replace('{n}', String(readMinutes))}</span>
    </div>
  )
}

export function TagList({ tags }: { tags: string[] }) {
  const { t } = useI18n()
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mb-10">
      <span className="text-xs font-semibold text-white/30">{t('articles.tags_label')}</span>
      {tags.map((tag) => (
        <span key={tag} className="px-2.5 py-1 text-xs rounded-full bg-surface border border-border text-white/60">
          {tag}
        </span>
      ))}
    </div>
  )
}
