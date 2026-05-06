'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

type Status = 'pending' | 'approved' | 'rejected' | null

interface VerifyRequest {
  id: string
  status: Status
  category: string
  created_at: string
  admin_note?: string | null
}

export default function VerifyPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState<VerifyRequest | null>(null)

  const [category, setCategory] = useState('creator')
  const [reason, setReason] = useState('')
  const [website, setWebsite] = useState('')
  const [socialLinks, setSocialLinks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const CATEGORIES = [
    { key: 'creator',       label: t('verify.cat.creator') },
    { key: 'business',      label: t('verify.cat.business') },
    { key: 'media',         label: t('verify.cat.media') },
    { key: 'public_figure', label: t('verify.cat.public_figure') },
    { key: 'other',         label: t('verify.cat.other') },
  ]

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const tok = data.session?.access_token ?? null
      if (!tok) { router.replace('/login'); return }
      setToken(tok)
      // fetch existing request
      const res = await fetch('/api/user/verify-request', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const d = await res.json()
      setExisting(d.request)
      setLoading(false)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/user/verify-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, reason, website, social_links: socialLinks }),
      })
      const d = await res.json()
      if (!res.ok) {
        if (d.error === 'cooldown') setError(`재신청까지 ${d.days_left}일 남았습니다.`)
        else setError(d.error ?? '오류가 발생했습니다.')
      } else {
        setSuccess(true)
        setExisting({ id: '', status: 'pending', category, created_at: new Date().toISOString() })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-lg mx-auto px-4 py-12">

        <Link href="/mypage" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" /> {t('mypage.title')}
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <BadgeCheck className="w-7 h-7 flex-shrink-0" style={{ color: 'rgb(255,77,0)' }} />
          <h1 className="text-2xl font-black">{t('verify.title')}</h1>
        </div>
        <p className="text-sm text-white/40 leading-relaxed mb-8">{t('verify.desc')}</p>

        {/* Existing request status */}
        {existing && (
          <div className={`rounded-2xl border p-5 mb-8 ${
            existing.status === 'approved'
              ? 'border-accent/30 bg-accent/5'
              : existing.status === 'rejected'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-yellow-500/30 bg-yellow-500/5'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold ${
                existing.status === 'approved' ? 'text-accent'
                : existing.status === 'rejected' ? 'text-red-400'
                : 'text-yellow-400'
              }`}>
                {existing.status === 'approved' ? t('verify.approved')
                  : existing.status === 'rejected' ? t('verify.rejected')
                  : t('verify.pending')}
              </span>
            </div>
            <p className="text-xs text-white/40">
              {existing.status === 'pending' ? t('verify.pending_desc') : t('verify.rejected_desc')}
            </p>
            {existing.admin_note && (
              <p className="mt-2 text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">
                {existing.admin_note}
              </p>
            )}
          </div>
        )}

        {/* Form — only show if no pending/approved request */}
        {(!existing || existing.status === 'rejected') && !success && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2">{t('verify.category')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      category === c.key
                        ? 'border-accent text-white'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white/70'
                    }`}
                    style={category === c.key ? { background: 'rgba(255,77,0,0.15)' } : undefined}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2">{t('verify.reason')} <span className="text-accent">*</span></label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('verify.reason_ph')}
                rows={4}
                required
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2">{t('verify.website')}</label>
              <input
                type="url"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder={t('verify.website_ph')}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Social links */}
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2">{t('verify.social')}</label>
              <input
                type="text"
                value={socialLinks}
                onChange={e => setSocialLinks(e.target.value)}
                placeholder={t('verify.social_ph')}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="w-full py-3 rounded-full text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'rgb(255,77,0)' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('verify.submit')}
            </button>
          </form>
        )}

        {success && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 text-center">
            <BadgeCheck className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgb(255,77,0)' }} />
            <p className="text-sm font-semibold text-white">{t('verify.success')}</p>
            <p className="text-xs text-white/40 mt-1">{t('verify.pending_desc')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
