'use client'

import Link from 'next/link'
import { ChevronUp, MessageSquare, Eye } from 'lucide-react'

export interface FeedPost {
  id: string
  type: string
  category?: string | null
  title: string
  body: string
  upvotes: number
  comment_count: number
  view_count: number
  rating?: number | null
  created_at: string
  user_display_name: string
  my_vote?: boolean
  community_post_products?: { products: { id: string; name: string } | null }[]
  community_compare_options?: { vote_count: number }[]
}

export function extractFirstImage(body: string): string | null {
  const m = (body ?? '').match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : null
}

export function stripHtml(html: string): string {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function timeAgo(d: string, t: (k: string) => string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return t('time.just')
  if (s < 3600) return `${Math.floor(s / 60)}${t('time.min')}`
  if (s < 86400) return `${Math.floor(s / 3600)}${t('time.hour')}`
  return `${Math.floor(s / 86400)}${t('time.day')}`
}

export function CardPost({ post, token, onVote, t, showType = true }: {
  post: FeedPost
  token: string | null
  onVote?: (id: string) => void
  t: (k: string) => string
  showType?: boolean
}) {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const thumbUrl = isHtml ? extractFirstImage(post.body) : null
  const plainText = isHtml ? stripHtml(post.body) : (post.body ?? '')
  const isImageOnly = thumbUrl !== null && plainText.length < 10
  const linkedProduct = post.community_post_products?.[0]?.products

  return (
    <div className="flex group border-b border-border/40 py-3 px-2 hover:bg-white/[0.02] transition-colors">
      {/* upvote */}
      <div className="flex flex-col items-center pt-0.5 px-2 w-10 flex-shrink-0">
        <button
          onClick={e => { e.preventDefault(); if (token && onVote) onVote(post.id) }}
          className={`p-0.5 transition-colors ${post.my_vote ? 'text-accent' : 'text-white/20 hover:text-accent'}`}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className={`text-[11px] font-bold tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/25'}`}>
          {post.upvotes}
        </span>
      </div>

      {/* content */}
      <Link href={`/community/posts/${post.id}`} className="flex-1 min-w-0 pr-2">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {showType && (
            <span className="text-[10px] font-semibold text-accent/70">{t(`community.${post.type}`)}</span>
          )}
          {showType && <span className="text-white/15 text-[10px]">·</span>}
          <span className="text-[10px] text-white/25">{post.user_display_name}</span>
          <span className="text-white/15 text-[10px]">·</span>
          <span className="text-[10px] text-white/20">{timeAgo(post.created_at, t)}</span>
          {post.rating != null && (
            <>
              <span className="text-white/15 text-[10px]">·</span>
              <span className="text-[10px] font-bold text-amber-400">{post.rating}/10</span>
            </>
          )}
        </div>

        {linkedProduct && (
          <span className="inline-flex items-center text-[9px] font-semibold bg-accent/10 text-accent/70 border border-accent/20 rounded-full px-2 py-0.5 mb-1.5">
            {linkedProduct.name}
          </span>
        )}

        <p className="text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-2 mb-1.5">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-xs text-accent font-semibold">[{post.comment_count}]</span>
          )}
        </p>

        {isImageOnly && (
          <div className="mb-2 rounded-lg overflow-hidden bg-surface-2 flex items-center justify-center max-h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl!} alt="" className="w-full max-h-64 object-contain" />
          </div>
        )}

        {!thumbUrl && plainText && (
          <p className="text-xs text-white/30 line-clamp-3 mb-1.5 leading-relaxed">{plainText}</p>
        )}

        {thumbUrl && !isImageOnly && plainText && (
          <p className="text-xs text-white/30 line-clamp-3 mb-1.5 leading-relaxed pr-2">{plainText}</p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-white/20">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {post.comment_count} {t('community.comments')}
          </span>
          {post.view_count > 0 && (
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
          )}
        </div>
      </Link>

      {thumbUrl && !isImageOnly && (
        <Link href={`/community/posts/${post.id}`} className="flex-shrink-0 ml-3 self-start mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl} alt="" className="w-20 h-20 object-contain rounded-lg bg-surface-2 p-1" />
        </Link>
      )}
    </div>
  )
}

export function CompactPost({ post, token, onVote, t, showType = true }: {
  post: FeedPost
  token: string | null
  onVote?: (id: string) => void
  t: (k: string) => string
  showType?: boolean
}) {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const thumbUrl = isHtml ? extractFirstImage(post.body) : null
  const plainText = !thumbUrl ? (isHtml ? stripHtml(post.body) : (post.body ?? '')) : ''
  const linkedProduct = post.community_post_products?.[0]?.products

  return (
    <div className="flex group py-2 px-2 hover:bg-white/[0.02] transition-colors gap-2 border-b border-border/30">
      <div className="flex items-center gap-0.5 flex-shrink-0 w-12 pt-0.5">
        <button
          onClick={e => { e.preventDefault(); if (token && onVote) onVote(post.id) }}
          className={`p-0.5 transition-colors ${post.my_vote ? 'text-accent' : 'text-white/20 hover:text-accent'}`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <span className={`text-[11px] font-bold tabular-nums ${post.my_vote ? 'text-accent' : 'text-white/25'}`}>
          {post.upvotes}
        </span>
      </div>

      {thumbUrl && (
        <Link href={`/community/posts/${post.id}`} className="flex-shrink-0 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl} alt="" className="w-16 h-16 object-contain rounded-md bg-surface-2 p-0.5" />
        </Link>
      )}

      <div className="flex-1 min-w-0">
        {(showType || linkedProduct) && (
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            {showType && (
              <span className="text-[10px] font-semibold text-accent/70">{t(`community.${post.type}`)}</span>
            )}
            {linkedProduct && (
              <span className="text-[9px] font-semibold bg-accent/10 text-accent/70 border border-accent/20 rounded-full px-1.5 py-0.5">
                {linkedProduct.name}
              </span>
            )}
          </div>
        )}
        <Link href={`/community/posts/${post.id}`}>
          <p className="text-sm font-medium text-white/75 group-hover:text-white transition-colors leading-snug line-clamp-1">
            {post.title}
            {post.comment_count > 0 && (
              <span className="ml-1.5 text-[11px] text-accent font-semibold">[{post.comment_count}]</span>
            )}
          </p>
          {!thumbUrl && plainText && (
            <p className="text-[11px] text-white/25 line-clamp-2 leading-relaxed mt-0.5">{plainText}</p>
          )}
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-white/20 mt-0.5">
          {post.rating != null && <span className="text-amber-400 font-bold">{post.rating}/10</span>}
          <span>{post.user_display_name}</span>
          <span>{timeAgo(post.created_at, t)}</span>
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
        </div>
      </div>
    </div>
  )
}

export function PostSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2 px-2 animate-pulse border-b border-border/30">
        <div className="w-12 h-3 bg-white/5 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 bg-white/5 rounded" />
          <div className="h-2.5 w-full bg-white/5 rounded" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex py-3 px-2 animate-pulse border-b border-border/40">
      <div className="w-10 flex-shrink-0 flex flex-col items-center pt-1 gap-1">
        <div className="w-5 h-5 bg-white/5 rounded" />
        <div className="w-4 h-2.5 bg-white/5 rounded" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2 w-32 bg-white/5 rounded" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
        <div className="h-2.5 w-full bg-white/5 rounded" />
        <div className="h-2 w-24 bg-white/5 rounded" />
      </div>
    </div>
  )
}

export function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const pages: number[] = []
  const start = Math.max(1, page - 3)
  const end = Math.min(totalPages, start + 6)
  for (let i = start; i <= end; i++) pages.push(i)
  const btn = 'px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-white/35 hover:text-white disabled:opacity-30 transition-colors'
  return (
    <div className="flex justify-center gap-1 mt-8">
      <button disabled={page === 1} onClick={() => onPage(1)} className={btn}>«</button>
      <button disabled={page === 1} onClick={() => onPage(page - 1)} className={btn}>‹</button>
      {pages.map(p => (
        <button key={p} onClick={() => onPage(p)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            p === page ? 'bg-accent border-accent text-white' : 'bg-surface border-border text-white/35 hover:text-white'
          }`}>{p}</button>
      ))}
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={btn}>›</button>
      <button disabled={page >= totalPages} onClick={() => onPage(totalPages)} className={btn}>»</button>
    </div>
  )
}
