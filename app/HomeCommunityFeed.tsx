'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

type MiniPost = {
  id: string
  type: string
  title: string
  body: string | null
  upvotes: number
  comment_count: number
  view_count: number
  created_at: string
  user_display_name: string | null
  is_bot: boolean
  source_name: string | null
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function timeAgo(dateStr: string, t: (k: string) => string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return t('time.just')
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}${t('time.hour')}`
  return `${Math.floor(seconds / 86400)}${t('time.day')}`
}

const TYPE_LABEL: Record<string, string> = {
  forum: 'Forum',
  review: 'Review',
  compare: 'Compare',
  free: 'Free',
  qa: 'Q&A',
  news: 'News',
}

function MasonryCard({ post, t }: { post: MiniPost; t: (k: string) => string }) {
  const snippet = stripHtml(post.body).slice(0, 160)
  const typeKey = post.is_bot ? 'news' : post.type
  const label = TYPE_LABEL[typeKey] ?? typeKey

  return (
    <Link
      href={`/community/post/${post.id}`}
      className="block bg-surface border border-border/50 rounded-2xl p-4 hover:border-border hover:bg-surface/80 transition-colors duration-150 cursor-pointer"
      style={{ breakInside: 'avoid', marginBottom: '12px' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ color: 'rgba(255,77,0,0.85)', background: 'rgba(255,77,0,0.1)' }}
        >
          {label}
        </span>
        {post.is_bot && post.source_name && (
          <span className="text-[10px] text-white/30 truncate">{post.source_name}</span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-white/90 leading-snug line-clamp-3 mb-2">
        {post.title}
      </h3>

      {snippet && (
        <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-3">
          {snippet}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-white/30">
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          {post.upvotes}
        </span>
        <span className="flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {post.comment_count}
        </span>
        <span className="ml-auto">{timeAgo(post.created_at, t)}</span>
      </div>
    </Link>
  )
}

function SkeletonCard({ height }: { height: number }) {
  return (
    <div
      className="bg-surface border border-border/30 rounded-2xl p-4 animate-pulse"
      style={{ breakInside: 'avoid', marginBottom: '12px', minHeight: height }}
    >
      <div className="h-3 w-16 bg-white/10 rounded mb-3" />
      <div className="h-3 bg-white/10 rounded mb-2 w-full" />
      <div className="h-3 bg-white/10 rounded mb-2 w-4/5" />
      <div className="h-3 bg-white/10 rounded w-2/3" />
    </div>
  )
}

const SKELETON_HEIGHTS = [100, 140, 110, 160, 130, 120, 150, 95, 165, 125, 140, 110]

export default function HomeCommunityFeed() {
  const { t } = useI18n()
  const [posts, setPosts] = useState<MiniPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/community/posts?sort=hot&limit=50')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const all: MiniPost[] = data.posts ?? []
        // 일반 글 → 뉴스/봇 순으로 정렬
        const regular = all.filter((p) => !p.is_bot)
        const bots = all.filter((p) => p.is_bot)
        setPosts([...regular, ...bots])
      } catch {
        // silent fail — optional section
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section className="w-full max-w-7xl mx-auto px-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-black text-white/80 tracking-tight">
          {t('community.feed_heading')}
        </h2>
        <Link
          href="/community"
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          {t('community.more')} →
        </Link>
      </div>

      {loading ? (
        <div
          style={{
            columns: '2 200px',
            columnGap: '12px',
          }}
        >
          {SKELETON_HEIGHTS.map((h, i) => (
            <SkeletonCard key={i} height={h} />
          ))}
        </div>
      ) : (
        <div
          style={{
            columns: '2 200px',
            columnGap: '12px',
          }}
          className="[column-fill:_balance] sm:columns-3 lg:columns-4"
        >
          {posts.map((post) => (
            <MasonryCard key={post.id} post={post} t={t} />
          ))}
        </div>
      )}
    </section>
  )
}
