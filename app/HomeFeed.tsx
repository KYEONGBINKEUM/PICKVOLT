'use client'

import { useI18n } from '@/lib/i18n'
import { CardPost, type FeedPost } from '@/components/PostFeed'

interface Props {
  posts: FeedPost[]
}

export default function HomeFeed({ posts }: Props) {
  const { t } = useI18n()

  if (posts.length === 0) {
    return <p className="text-sm text-white/20 py-24 text-center">{t('board.empty')}</p>
  }

  const pinned = posts.filter((p) => p.is_pinned).slice(0, 3)
  const rest = pinned.length > 0
    ? posts.filter((p) => !pinned.some((h) => h.id === p.id))
    : posts

  return (
    <div>
      {pinned.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-black text-accent uppercase tracking-widest mb-2">
            {t('home.headlines')}
          </h2>
          {pinned.map((post) => (
            <CardPost key={post.id} post={post} token={null} t={t} showType={false} hideVotes />
          ))}
        </div>
      )}
      <div>
        {rest.map((post) => (
          <CardPost key={post.id} post={post} token={null} t={t} showType={false} hideVotes />
        ))}
      </div>
    </div>
  )
}
