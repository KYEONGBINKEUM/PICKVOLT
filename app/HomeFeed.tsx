'use client'

import { useI18n } from '@/lib/i18n'
import { CompactPost, type FeedPost } from '@/components/PostFeed'
import HomeFeatured from './HomeFeatured'

interface Props {
  posts: FeedPost[]
}

export default function HomeFeed({ posts }: Props) {
  const { t } = useI18n()

  if (posts.length === 0) {
    return <p className="text-sm text-white/20 py-24 text-center">{t('board.empty')}</p>
  }

  const pinned = posts.filter((p) => p.is_pinned).slice(0, 3)
  const featured = pinned.length > 0 ? pinned : posts.slice(0, 3)
  const rest = posts.filter((p) => !featured.some((f) => f.id === p.id))

  return (
    <div>
      <HomeFeatured posts={featured} />
      <div className="pt-1 sm:columns-2 lg:columns-3 gap-8 [column-rule:1px_solid_#2a2a2a]">
        {rest.map((post) => (
          <div key={post.id} className="break-inside-avoid">
            <CompactPost post={post} token={null} t={t} showType={false} hideVotes />
          </div>
        ))}
      </div>
    </div>
  )
}
