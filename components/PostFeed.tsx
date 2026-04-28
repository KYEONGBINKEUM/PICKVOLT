'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronUp, MessageSquare, Eye, Languages, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

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

// Remove product-card and compare-table blocks from HTML (for feed preview)
function removeStructuralElements(html: string): string {
  if (!html) return html
  if (typeof window === 'undefined') return html  // SSR passthrough
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    doc.querySelectorAll('[data-product-card],[data-compare-table]').forEach(el => el.remove())
    return doc.body.innerHTML
  } catch {
    return html
  }
}

export function extractFirstImage(body: string): string | null {
  const clean = removeStructuralElements(body ?? '')
  const re = /<img[^>]+>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(clean)) !== null) {
    const tag = m[0]
    const src = tag.match(/src=["']([^"']+)["']/)
    if (src) return src[1]
  }
  return null
}

export function extractAllImages(body: string): string[] {
  const clean = removeStructuralElements(body ?? '')
  const re = /<img[^>]+>/gi
  const imgs: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(clean)) !== null) {
    const tag = m[0]
    const src = tag.match(/src=["']([^"']+)["']/)
    if (src) imgs.push(src[1])
  }
  return imgs
}

function ImageSlider({ images, postId }: { images: string[]; postId: string }) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null
  return (
    <div className="relative mb-2 rounded-xl overflow-hidden bg-surface-2 group">
      <Link href={`/community/posts/${postId}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl(images[idx], 900)} alt="" className="w-full h-auto block" />
      </Link>
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); setIdx(i => (i - 1 + images.length) % images.length) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={e => { e.preventDefault(); setIdx(i => (i + 1) % images.length) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.preventDefault(); setIdx(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
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

// 사용자 로케일 기준으로 번역 필요 여부 판별
function needsTranslation(text: string, locale: string): boolean {
  const hasKorean  = /[\uAC00-\uD7A3]/.test(text)
  const hasJapanese = /[\u3040-\u30FF]/.test(text)
  const hasCJK     = /[\u4E00-\u9FFF]/.test(text)
  const hasCyrillic = /[\u0400-\u04FF]/.test(text)
  const hasArabic  = /[\u0600-\u06FF]/.test(text)
  const hasNonLatin = hasKorean || hasJapanese || hasCJK || hasCyrillic || hasArabic

  if (locale === 'ko') return !hasKorean
  if (locale === 'ja') return !hasJapanese && !hasCJK
  // 라틴 계열 로케일이면 비 라틴 문자 포함 시 번역 필요
  return hasNonLatin
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const res = await fetch(`/api/translate?q=${encodeURIComponent(text)}&tl=${targetLang}`)
  if (!res.ok) throw new Error('translate failed')
  const d = await res.json()
  return d.text ?? text
}

export function CardPost({ post, token, onVote, t, showType = true }: {
  post: FeedPost
  token: string | null
  onVote?: (id: string) => void
  t: (k: string) => string
  showType?: boolean
}) {
  const { locale } = useI18n()
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated]   = useState<{ title: string; body: string } | null>(null)

  const isHtml = /<[a-z]/i.test(post.body ?? '')
  // Strip product-card / compare-table blocks before extracting preview images & text
  const previewBody = isHtml ? removeStructuralElements(post.body) : (post.body ?? '')
  const images = isHtml ? extractAllImages(post.body) : []
  const rawPlain = isHtml ? stripHtml(previewBody) : (post.body ?? '')

  const displayTitle = translated?.title ?? post.title
  const displayPlain = translated?.body ?? rawPlain

  const linkedProduct = post.community_post_products?.[0]?.products
  const showTranslateBtn = needsTranslation(post.title + ' ' + rawPlain, locale)

  const handleTranslate = async () => {
    if (translated) { setTranslated(null); return }
    setTranslating(true)
    try {
      const [title, body] = await Promise.all([
        translateText(post.title, locale),
        translateText(rawPlain, locale),
      ])
      setTranslated({ title, body })
    } finally {
      setTranslating(false)
    }
  }

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
      <div className="flex-1 min-w-0">
        <Link href={`/community/posts/${post.id}`}>
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
            {displayTitle}
            {post.comment_count > 0 && (
              <span className="ml-1.5 text-xs text-accent font-semibold">[{post.comment_count}]</span>
            )}
          </p>

          {displayPlain && (
            <p className="text-xs text-white/30 line-clamp-2 mb-2 leading-relaxed">{displayPlain}</p>
          )}
        </Link>

        {images.length > 0 && !translated && (
          <ImageSlider images={images} postId={post.id} />
        )}

        <div className="flex items-center gap-3 text-[11px] text-white/20">
          <Link href={`/community/posts/${post.id}`} className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {post.comment_count} {t('community.comments')}
          </Link>
          {post.view_count > 0 && (
            <Link href={`/community/posts/${post.id}`} className="flex items-center gap-1">
              <Eye className="w-3 h-3" />{post.view_count}
            </Link>
          )}
          {showTranslateBtn && (
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-1 text-white/25 hover:text-accent/70 transition-colors disabled:opacity-40 ml-auto"
            >
              <Languages className="w-3 h-3" />
              {translating ? t('post.translating') : translated ? t('post.show_original') : t('post.translate')}
            </button>
          )}
        </div>
      </div>
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
  const { locale } = useI18n()
  const [translating, setTranslating] = useState(false)
  const [translated, setTranslated]   = useState<{ title: string; body: string } | null>(null)

  const isHtml = /<[a-z]/i.test(post.body ?? '')
  // Strip product-card / compare-table blocks before extracting preview images & text
  const previewBody = isHtml ? removeStructuralElements(post.body) : (post.body ?? '')
  const compactThumb = isHtml ? extractFirstImage(post.body) : null
  const rawPlain = isHtml ? stripHtml(previewBody) : (post.body ?? '')

  const displayTitle = translated?.title ?? post.title
  const displayPlain = translated?.body ?? rawPlain

  const linkedProduct = post.community_post_products?.[0]?.products
  const showTranslateBtn = needsTranslation(post.title + ' ' + rawPlain, locale)

  const handleTranslate = async () => {
    if (translated) { setTranslated(null); return }
    setTranslating(true)
    try {
      const [title, body] = await Promise.all([
        translateText(post.title, locale),
        rawPlain ? translateText(rawPlain, locale) : Promise.resolve(''),
      ])
      setTranslated({ title, body })
    } finally {
      setTranslating(false)
    }
  }

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

      {compactThumb && !translated && (
        <Link href={`/community/posts/${post.id}`} className="flex-shrink-0 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl(compactThumb, 128)} alt="" className="w-16 h-16 object-contain rounded-md bg-surface-2 p-0.5" />
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
            {displayTitle}
            {post.comment_count > 0 && (
              <span className="ml-1.5 text-[11px] text-accent font-semibold">[{post.comment_count}]</span>
            )}
          </p>
          {displayPlain && (
            <p className="text-[11px] text-white/25 line-clamp-2 leading-relaxed mt-0.5">{displayPlain}</p>
          )}
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-white/20 mt-0.5">
          {post.rating != null && <span className="text-amber-400 font-bold">{post.rating}/10</span>}
          <span>{post.user_display_name}</span>
          <span>{timeAgo(post.created_at, t)}</span>
          <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post.comment_count}</span>
          {showTranslateBtn && (
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="flex items-center gap-0.5 text-white/20 hover:text-accent/70 transition-colors disabled:opacity-40 ml-auto"
            >
              <Languages className="w-3 h-3" />
              {translating ? t('post.translating') : translated ? t('post.show_original') : t('post.translate')}
            </button>
          )}
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
