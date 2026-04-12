'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, Trash2, Pencil, Check, X, ChevronRight, Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

interface Review {
  id: string
  user_id: string
  user_display_name: string
  avatar_url: string | null
  content: string
  rating: number
  likes: number
  created_at: string
}

interface Props {
  productId: string
  compact?: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function getFingerprint(): string {
  let fp = localStorage.getItem('pv_fp')
  if (!fp) { fp = crypto.randomUUID(); localStorage.setItem('pv_fp', fp) }
  return fp
}

function getLikedSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('pv_liked') ?? '[]')) } catch { return new Set() }
}
function saveLikedSet(set: Set<string>) {
  localStorage.setItem('pv_liked', JSON.stringify(Array.from(set)))
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
            value >= n ? 'bg-accent text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'
          }`}
        >
          {n}
        </button>
      ))}
      <span className="ml-2 text-xs text-white/40 font-semibold">/ 10</span>
    </div>
  )
}

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 8 ? 'text-green-400' : rating >= 5 ? 'text-accent' : 'text-red-400'
  return (
    <span className={`text-sm font-black ${color}`}>
      {rating}<span className="text-xs text-white/30 font-normal">/10</span>
    </span>
  )
}

export default function ReviewSection({ productId, compact = false }: Props) {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  // 새 리뷰 작성
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  // 리뷰 수정
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editRating, setEditRating] = useState(7)
  const [editErrMsg, setEditErrMsg] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    setLikedIds(getLikedSet())
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    supabase.auth.getSession().then(({ data }) => {
      const email = (data.session?.user.email ?? '').toLowerCase()
      setMyUserId(data.session?.user.id ?? null)
      setIsAdmin(adminEmails.length > 0 && adminEmails.includes(email))
      setToken(data.session?.access_token ?? null)
      setSessionLoaded(true)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews?product_id=${productId}`)
      const json = await res.json()
      setReviews(json.reviews ?? [])
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { load() }, [load])

  const hasMyReview = myUserId ? reviews.some((r) => r.user_id === myUserId) : false
  const displayed = compact ? reviews.slice(0, 3) : reviews

  const handleSubmit = async () => {
    if (!content.trim() || !token) return
    setSubmitting(true)
    setErrMsg('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, content, rating }),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error ?? '오류가 발생했습니다'); return }
      setContent(''); setRating(7)
      setReviews((prev) => [json.review, ...prev])
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!token) return
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }

  const startEdit = (r: Review) => {
    setEditingId(r.id); setEditContent(r.content); setEditRating(r.rating ?? 7); setEditErrMsg('')
  }
  const cancelEdit = () => { setEditingId(null); setEditContent(''); setEditErrMsg('') }

  const handleEdit = async (reviewId: string) => {
    if (!token) return
    const trimmed = editContent.trim()
    if (trimmed.length < 10) { setEditErrMsg('10자 이상 입력해주세요'); return }
    setEditSaving(true); setEditErrMsg('')
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: trimmed, rating: editRating }),
      })
      const json = await res.json()
      if (!res.ok) { setEditErrMsg(json.error ?? '오류가 발생했습니다'); return }
      setReviews((prev) => prev.map((r) => r.id === reviewId ? json.review : r))
      setEditingId(null)
    } finally {
      setEditSaving(false)
    }
  }

  const handleLike = async (reviewId: string) => {
    const fp = getFingerprint()
    const res = await fetch(`/api/reviews/${reviewId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fp }),
    })
    if (!res.ok) return
    const { liked, likes } = await res.json()
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, likes } : r))
    const updated = getLikedSet()
    if (liked) updated.add(reviewId); else updated.delete(reviewId)
    setLikedIds(new Set(updated))
    saveLikedSet(updated)
  }

  /* ── Compact mode (compare page) ─────────────────────────── */
  if (compact) {
    return (
      <div className="pt-3">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">{t('review.title')}</p>
        {loading ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-xs text-white/20">{t('review.empty')}</p>
        ) : (
          <div className="space-y-2">
            {displayed.map((r) => (
              <div key={r.id} className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <RatingBadge rating={r.rating ?? 5} />
                  <span className="text-[10px] text-white/20">·</span>
                  <span className="text-[10px] text-white/30">{r.user_display_name}</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3 whitespace-pre-wrap">{r.content}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Heart className={`w-3 h-3 ${likedIds.has(r.id) ? 'text-red-400 fill-red-400' : 'text-white/20'}`} />
                  <span className="text-[10px] text-white/25">{r.likes}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/product/${productId}`}
          className="inline-flex items-center gap-0.5 mt-3 text-[11px] text-white/25 hover:text-white/50 transition-colors"
        >
          {sessionLoaded && myUserId && !hasMyReview ? t('review.write') : t('review.all')}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  /* ── Full mode (product detail page) ─────────────────────── */
  return (
    <div className="mt-10">
      <h2 className="text-base font-bold text-white mb-5">{t('review.title')}</h2>

      {/* 새 리뷰 작성 폼 */}
      {sessionLoaded && myUserId && !hasMyReview && (
        <div className="mb-6 bg-surface border border-border rounded-2xl p-4">
          <div className="mb-3">
            <p className="text-xs text-white/40 mb-2">{t('review.score')}</p>
            <RatingPicker value={rating} onChange={setRating} />
          </div>
          <div className="border-t border-border pt-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('review.placeholder')}
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-sm text-white/80 placeholder-white/20 resize-none outline-none leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-white/20">{content.length} / 500</span>
            <div className="flex items-center gap-3">
              {errMsg && <span className="text-xs text-red-400">{errMsg}</span>}
              <button
                onClick={handleSubmit}
                disabled={submitting || content.trim().length < 10}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              >
                <Send className="w-3 h-3" />
                {t('review.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionLoaded && !myUserId && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-2xl flex items-center justify-between gap-4">
          <p className="text-sm text-white/40">{t('review.sign_in_prompt')}</p>
          <Link href="/login" className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors flex-shrink-0">
            {t('review.sign_in_cta')}
          </Link>
        </div>
      )}

      {/* 리뷰 목록 */}
      {loading ? (
        <div className="flex gap-1.5 py-6 justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-white/20 text-center py-8">{t('review.empty')}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-surface border border-border rounded-2xl p-4">
              {/* 헤더 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.avatar_url} alt={r.user_display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-accent uppercase">{r.user_display_name[0]}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white/70">{r.user_display_name}</p>
                      <RatingBadge rating={r.rating ?? 5} />
                    </div>
                    <p className="text-[10px] text-white/30">{timeAgo(r.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.user_id === myUserId && editingId !== r.id && (
                    <button onClick={() => startEdit(r)} className="text-white/20 hover:text-white/60 transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(r.user_id === myUserId || isAdmin) && editingId !== r.id && (
                    <button onClick={() => handleDelete(r.id)} className="text-white/20 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 본문 또는 수정 폼 */}
              {editingId === r.id ? (
                <div className="mt-3">
                  <div className="mb-2">
                    <p className="text-xs text-white/40 mb-1.5">{t('review.score')}</p>
                    <RatingPicker value={editRating} onChange={setEditRating} />
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-white/80 resize-none outline-none leading-relaxed focus:border-white/20 transition-colors mt-2"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/20">{editContent.length} / 500</span>
                    <div className="flex items-center gap-2">
                      {editErrMsg && <span className="text-xs text-red-400">{editErrMsg}</span>}
                      <button onClick={cancelEdit} className="flex items-center gap-1 text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-full transition-colors">
                        <X className="w-3 h-3" /> {t('review.cancel')}
                      </button>
                      <button
                        onClick={() => handleEdit(r.id)}
                        disabled={editSaving || editContent.trim().length < 10}
                        className="flex items-center gap-1 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1 rounded-full transition-all"
                      >
                        <Check className="w-3 h-3" /> {t('review.save')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-white/70 leading-relaxed mt-3 whitespace-pre-wrap">{r.content}</p>
                  {/* 좋아요 버튼 */}
                  <button
                    onClick={() => handleLike(r.id)}
                    className="flex items-center gap-1.5 mt-3 group"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-all ${
                        likedIds.has(r.id)
                          ? 'text-red-400 fill-red-400'
                          : 'text-white/25 group-hover:text-red-400 group-hover:fill-red-400/30'
                      }`}
                    />
                    <span className={`text-xs transition-colors ${likedIds.has(r.id) ? 'text-red-400' : 'text-white/25 group-hover:text-white/50'}`}>
                      {r.likes > 0 ? r.likes : t('review.helpful')}
                    </span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
