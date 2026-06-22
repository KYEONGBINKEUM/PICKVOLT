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

function getImage(post: MiniPost): string | null {
  if (!post.body) return null
  const match = post.body.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] ?? null
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
  const snippet = stripHtml(post.body).slice(0, 120)
  const typeKey = post.is_bot ? 'news' : post.type
  const label = TYPE_LABEL[typeKey] ?? typeKey
  const image = getImage(post)

  return (
    <Link
      href={`/community/posts/${post.id}`}
      className="block bg-surface border border-border/40 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/[0.03] transition-colors duration-150 group"
      style={{ breakInside: 'avoid', marginBottom: '10px', display: 'block' }}
    >
      {image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={image}
          alt={post.title}
          className="w-full h-auto object-contain bg-surface-2 p-3 rounded-xl"
          loading="lazy"
        />
      )}

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
            style={{ color: 'rgba(255,77,0,0.9)', background: 'rgba(255,77,0,0.1)' }}
          >
            {label}
          </span>
          {post.is_bot && post.source_name && (
            <span className="text-[9px] text-white/25 truncate">{post.source_name}</span>
          )}
        </div>

        <h3 className="text-[13px] font-semibold text-white/85 leading-snug line-clamp-2 mb-1 group-hover:text-white transition-colors">
          {post.title}
        </h3>

        {snippet && (
          <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2 mb-1">
            {snippet}
          </p>
        )}

        <div className="flex items-center gap-2.5 text-[10px] text-white/25 mt-2">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 10v12m8-16.12L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
            {post.upvotes}
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {post.comment_count}
          </span>
          <span className="ml-auto text-white/20">{timeAgo(post.created_at, t)}</span>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard({ hasImage }: { hasImage: boolean }) {
  return (
    <div
      className="bg-surface border border-border/30 rounded-2xl overflow-hidden animate-pulse"
      style={{ breakInside: 'avoid', marginBottom: '10px' }}
    >
      {hasImage && <div className="w-full bg-white/5" style={{ height: '120px' }} />}
      <div className="p-3">
        <div className="h-2.5 w-12 bg-white/10 rounded mb-2.5" />
        <div className="h-3 bg-white/10 rounded mb-1.5 w-full" />
        <div className="h-3 bg-white/10 rounded w-3/4" />
      </div>
    </div>
  )
}

const SKELETON_PATTERN = [true, false, true, true, false, true, false, true, true, false, true, false, true, false, false, true]

export default function HomeCommunityFeed() {
  const { t } = useI18n()
  const [posts, setPosts] = useState<MiniPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/community/posts?sort=latest&limit=50')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const all: MiniPost[] = data.posts ?? []
        const regular = all.filter((p) => !p.is_bot)
        const bots = all.filter((p) => p.is_bot)
        setPosts([...regular, ...bots])
      } catch {
        // silent — optional section
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section className="w-full px-4 sm:px-6 pb-24 pt-16">
      {loading ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-[10px]">
          {SKELETON_PATTERN.map((hasImage, i) => (
            <SkeletonCard key={i} hasImage={hasImage} />
          ))}
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-[10px]">
          {posts.map((post) => (
            <MasonryCard key={post.id} post={post} t={t} />
          ))}
        </div>
      )}
    </section>
  )
}
