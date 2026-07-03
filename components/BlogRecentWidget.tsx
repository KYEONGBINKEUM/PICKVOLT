'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { CompactPost, PostSkeleton, type FeedPost } from '@/components/PostFeed'

export default function BlogRecentWidget() {
  const { t } = useI18n()
  const [posts, setPosts] = useState<FeedPost[] | null>(null)

  useEffect(() => {
    fetch('/api/community/posts?type=news&sort=latest&page=1&limit=5')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]))
  }, [])

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <h3 className="text-sm font-black text-white mb-2">{t('community.news')}</h3>
      {posts === null ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} compact />)
      ) : posts.length === 0 ? (
        <p className="text-xs text-white/20 py-6 text-center">{t('board.empty')}</p>
      ) : (
        posts.map((post) => (
          <CompactPost key={post.id} post={post} token={null} t={t} showType={false} hideVotes />
        ))
      )}
    </div>
  )
}
