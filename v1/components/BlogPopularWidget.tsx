'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'
import WidgetTitle from '@/components/WidgetTitle'

export default function BlogPopularWidget() {
  const { t } = useI18n()
  const [posts, setPosts] = useState<FeedPost[] | null>(null)

  useEffect(() => {
    fetch('/api/community/posts?type=news&sort=views&page=1&limit=5')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]))
  }, [])

  return (
    <div>
      <WidgetTitle>{t('community.popular')}</WidgetTitle>
      {posts === null ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} compact />)
      ) : posts.length === 0 ? (
        <p className="text-xs text-white/20 py-6 text-center">{t('board.empty')}</p>
      ) : (
        posts.map((post, i) => (
          <div key={post.id} className="flex gap-3 items-start">
            <span className="font-serif text-2xl font-bold text-accent/70 leading-none w-6 flex-shrink-0 pt-2">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <CompactPost post={post} token={null} t={t} showType={false} hideVotes hideThumb />
            </div>
          </div>
        ))
      )}
    </div>
  )
}
