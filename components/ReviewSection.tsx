'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, Trash2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Review {
  id: string
  user_id: string
  user_display_name: string
  content: string
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

export default function ReviewSection({ productId, compact = false }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
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
        body: JSON.stringify({ product_id: productId, content }),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error ?? '오류가 발생했습니다'); return }
      setContent('')
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

  /* ── Compact mode (compare page) ─────────────────────────── */
  if (compact) {
    return (
      <div className="pt-3">
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 font-semibold">Reviews</p>
        {loading ? (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="text-xs text-white/20">No reviews yet</p>
        ) : (
          <div className="space-y-2">
            {displayed.map((r) => (
              <div key={r.id} className="rounded-lg bg-white/[0.03] border border-border p-2.5">
                <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{r.content}</p>
                <p className="text-[10px] text-white/25 mt-1.5">{r.user_display_name} · {timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/product/${productId}`}
          className="inline-flex items-center gap-0.5 mt-3 text-[11px] text-white/25 hover:text-white/50 transition-colors"
        >
          {sessionLoaded && myUserId && !hasMyReview ? 'Write a review' : 'All reviews'}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  /* ── Full mode (product detail page) ─────────────────────── */
  return (
    <div className="mt-10">
      <h2 className="text-base font-bold text-white mb-5">User Reviews</h2>

      {/* Write form */}
      {sessionLoaded && myUserId && !hasMyReview && (
        <div className="mb-6 bg-surface border border-border rounded-2xl p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience with this product… (10–500 characters)"
            rows={3}
            maxLength={500}
            className="w-full bg-transparent text-sm text-white/80 placeholder-white/20 resize-none outline-none leading-relaxed"
          />
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
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionLoaded && !myUserId && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-2xl flex items-center justify-between gap-4">
          <p className="text-sm text-white/40">Sign in to write a review</p>
          <Link href="/login" className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors flex-shrink-0">
            Sign in →
          </Link>
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="flex gap-1.5 py-6 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/20 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-white/20 text-center py-8">
          No reviews yet. Be the first to share your experience!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-surface border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-accent uppercase">
                      {r.user_display_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/70">{r.user_display_name}</p>
                    <p className="text-[10px] text-white/30">{timeAgo(r.created_at)}</p>
                  </div>
                </div>
                {(r.user_id === myUserId || isAdmin) && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-white/20 hover:text-red-400 transition-colors"
                    title="Delete review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-white/70 leading-relaxed mt-3">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
