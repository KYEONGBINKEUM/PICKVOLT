'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronLeft, ChevronRight, MessageSquare, Eye } from 'lucide-react'

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

export function extractAllImages(body: string): string[] {
  const results: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(body ?? '')) !== null) results.push(m[1])
  return results
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

function ImageCarousel({ images, postHref }: { images: string[]; postHref: string }) {
  const [idx, setIdx] = useState(0)
  const prev = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length) }
  const next = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setIdx(i => (i + 1) % images.length) }

  return (
    <div className="relative bg-surface-2 overflow-hidden select-none" style={{ maxHeight: 480 }}>
      <a href={postHref} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[idx]}
          alt=""
          className="w-full object-contain"
          style={{ maxHeight: 480 }}
          draggable={false}
        />
      </a>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setIdx(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/35 hover:bg-white/60'}`}
              />
            ))}
          </div>

          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/60 backdrop-blur-sm text-white/80 rounded-full px-2 py-0.5 z-10">
            {idx + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  )
}

export function CardPost({ post, token, onVote, t, showType = true }: {
  post: FeedPost
  token: string | null
  onVote?: (id: string) => void
  t: (k: string) => string
  showType?: boolean
}) {
  const isHtml = /<[a-z]/i.test(post.body ?? '')
  const images = isHtml ? extractAllImages(post.body) : []
  const plainText = isHtml ? stripHtml(post.body) : (post.body ?? '')
  const linkedProduct = post.community_post_products?.[0]?.products
  const href = `/community/posts/${post.id}`

  return (
    <div className="group bg-surface border border-border/50 rounded-xl mb-3 overflow-hidden hover:border-white/15 transition-all">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
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
        <button
          onClick={e => { e.preventDefault(); if (token && onVote) onVote(post.id) }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors flex-shrink-0 ${
            post.my_vote
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border text-white/25 hover:border-accent/40 hover:text-accent'
          }`}
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold tabular-nums">{post.upvotes}</span>
        </button>
      </div>

      {/* Title */}
      <Link href={href} className="block px-4 pb-2.5">
        {linkedProduct && (
          <span className="inline-flex items-center text-[9px] font-semibold bg-accent/10 text-accent/70 border border-accent/20 rounded-full px-2 py-0.5 mb-1.5">
            {linkedProduct.name}
          </span>
        )}
        <p className="text-[15px] font-semibold text-white/85 group-hover:text-white transition-colors leading-snug">
          {post.title}
          {post.comment_count > 0 && (
            <span className="ml-1.5 text-xs text-accent font-semibold">[{post.comment_count}]</span>
          )}
        </p>
      </Link>

      {/* Images */}
      {images.length > 0 && <ImageCarousel images={images} postHref={href} />}

      {/* Text preview (no images) */}
      {images.length === 0 && plainText && (
        <Link href={href} className="block px-4 pb-3">
          <p className="text-sm text-white/35 line-clamp-4 leading-relaxed">{plainText}</p>
        </Link>
      )}

      {/* Footer */}
      <Link href={href} className="flex items-center gap-4 px-4 py-2.5 border-t border-border/30 text-[11px] text-white/20 hover:text-white/40 transition-colors">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {post.comment_count} {t('community.comments')}
        </span>
        {post.view_count > 0 && (
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count}</span>
        )}
      </Link>
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
  const plainText = isHtml ? stripHtml(post.body) : (post.body ?? '')

  return (
    <div className="flex group py-2.5 px-2 hover:bg-white/[0.02] transition-colors gap-3 border-b border-border/30">
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

      <div className="flex-1 min-w-0">
        {showType && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-semibold text-accent/70">{t(`community.${post.type}`)}</span>
          </div>
        )}
        <Link href={`/community/posts/${post.id}`}>
          <p className="text-sm font-medium text-white/75 group-hover:text-white transition-colors leading-snug line-clamp-2">
            {post.title}
            {post.comment_count > 0 && (
              <span className="ml-1.5 text-[11px] text-accent font-semibold">[{post.comment_count}]</span>
            )}
          </p>
          {plainText && (
            <p className="text-[11px] text-white/25 line-clamp-2 leading-relaxed mt-0.5">{plainText}</p>
          )}
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-white/20 mt-1">
          {post.rating != null && <span className="text-amber-400 font-bold">{post.rating}/10</span>}
          <span>{post.user_display_name}</span>
          <span>{timeAgo(post.created_at, t)}</span>
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
        </div>
      </div>

      {thumbUrl && (
        <Link href={`/community/posts/${post.id}`} className="flex-shrink-0 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl} alt="" className="w-24 h-24 object-cover rounded-lg bg-surface-2" />
        </Link>
      )}
    </div>
  )
}

export function PostSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-2 animate-pulse border-b border-border/30">
        <div className="w-12 h-3 bg-white/5 rounded flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 bg-white/5 rounded" />
          <div className="h-2.5 w-full bg-white/5 rounded" />
          <div className="h-2.5 w-2/3 bg-white/5 rounded" />
        </div>
        <div className="w-24 h-24 bg-white/5 rounded-lg flex-shrink-0" />
      </div>
    )
  }
  return (
    <div className="bg-surface border border-border/50 rounded-xl mb-3 overflow-hidden animate-pulse">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="h-2 w-32 bg-white/5 rounded" />
        <div className="h-6 w-12 bg-white/5 rounded-full" />
      </div>
      <div className="px-4 pb-2.5 space-y-2">
        <div className="h-4 w-3/4 bg-white/5 rounded" />
        <div className="h-3 w-1/2 bg-white/5 rounded" />
      </div>
      <div className="h-52 bg-white/5" />
      <div className="px-4 py-2.5 border-t border-border/30">
        <div className="h-2.5 w-24 bg-white/5 rounded" />
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
