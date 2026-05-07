'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, ChevronLeft, Loader2, Upload, CheckCircle2 } from 'lucide-react'
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
  const fileRef = useRef<HTMLInputElement>(null)

  const [token, setToken]       = useState<string | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [existing, setExisting] = useState<VerifyRequest | null>(null)

  const [category, setCategory]       = useState('creator')
  const [reason, setReason]           = useState('')
  const [website, setWebsite]         = useState('')
  const [socialLinks, setSocialLinks] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState(false)

  // 이메일 인증
  const [workEmail, setWorkEmail]         = useState('')
  const [otpSent, setOtpSent]             = useState(false)
  const [otpCode, setOtpCode]             = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingOtp, setSendingOtp]       = useState(false)
  const [confirmingOtp, setConfirmingOtp] = useState(false)
  const [otpError, setOtpError]           = useState('')
  const [codeSentMsg, setCodeSentMsg]     = useState('')

  // 파일 업로드
  const [idImageUrl, setIdImageUrl]       = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

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
      setUserId(data.session?.user?.id ?? null)
      const res = await fetch('/api/user/verify-request', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      const d = await res.json()
      setExisting(d.request)
      setLoading(false)
    })
  }, [router])

  const handleCategoryChange = (key: string) => {
    setCategory(key)
    setWorkEmail('')
    setOtpSent(false)
    setOtpCode('')
    setEmailVerified(false)
    setOtpError('')
    setIdImageUrl(null)
  }

  const handleSendOtp = async () => {
    if (!workEmail.trim()) return
    setSendingOtp(true)
    setOtpError('')
    setCodeSentMsg('')
    try {
      const res = await fetch('/api/user/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: workEmail }),
      })
      if (res.ok) {
        setOtpSent(true)
        setCodeSentMsg(t('verify.code_sent'))
      } else {
        const d = await res.json()
        setOtpError(d.error ?? 'error')
      }
    } finally {
      setSendingOtp(false)
    }
  }

  const handleConfirmOtp = async () => {
    if (!otpCode.trim()) return
    setConfirmingOtp(true)
    setOtpError('')
    try {
      const res = await fetch('/api/user/verify-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: workEmail, code: otpCode }),
      })
      if (res.ok) {
        setEmailVerified(true)
      } else {
        setOtpError(t('verify.otp_error'))
      }
    } finally {
      setConfirmingOtp(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingFile(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('verify-docs')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('verify-docs').getPublicUrl(path)
      setIdImageUrl(publicUrl)
    } catch {
      setError('Upload failed.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    if (!emailVerified) {
      setError(t('verify.email_required_err'))
      return
    }
    if (!idImageUrl) {
      setError(t('verify.id_required_err'))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/user/verify-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category,
          reason,
          website,
          social_links:   socialLinks,
          work_email:     workEmail,
          email_verified: emailVerified,
          id_image_url:   idImageUrl,
        }),
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

        {existing && (
          <div className={`rounded-2xl border p-5 mb-8 ${
            existing.status === 'approved'  ? 'border-accent/30 bg-accent/5'
            : existing.status === 'rejected' ? 'border-red-500/30 bg-red-500/5'
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
                    onClick={() => handleCategoryChange(c.key)}
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

            {/* 이메일 인증 — 전 카테고리 필수 */}
            <div>
                <label className="block text-xs font-semibold text-white/50 mb-2">
                  {t('verify.work_email')} <span className="text-accent">*</span>
                </label>
                {emailVerified ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl text-sm text-accent font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('verify.verified')}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={workEmail}
                        onChange={e => { setWorkEmail(e.target.value); setOtpSent(false); setOtpCode(''); setOtpError('') }}
                        placeholder={t('verify.work_email_ph')}
                        className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !workEmail.trim()}
                        className="px-4 py-3 rounded-xl text-xs font-bold text-white border border-border hover:border-white/20 transition-all disabled:opacity-40 whitespace-nowrap"
                      >
                        {sendingOtp ? t('verify.sending') : t('verify.send_code')}
                      </button>
                    </div>
                    {codeSentMsg && <p className="text-xs text-accent mt-1.5">{codeSentMsg}</p>}
                    {otpSent && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          placeholder={t('verify.otp_ph')}
                          maxLength={6}
                          className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmOtp}
                          disabled={confirmingOtp || otpCode.length < 6}
                          className="px-4 py-3 rounded-xl text-xs font-bold text-white border border-accent/50 bg-accent/10 hover:bg-accent/20 transition-all disabled:opacity-40"
                        >
                          {confirmingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : t('verify.confirm_code')}
                        </button>
                      </div>
                    )}
                    {otpError && <p className="text-xs text-red-400 mt-1.5">{otpError}</p>}
                  </>
                )}
            </div>

            {/* 신분증/명함 업로드 — 전 카테고리 필수 */}
            <div>
                <label className="block text-xs font-semibold text-white/50 mb-1">
                  {t('verify.id_upload')} <span className="text-accent">*</span>
                </label>
                <p className="text-xs text-white/30 mb-2">{t('verify.id_upload_desc')}</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {idImageUrl ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl text-sm text-accent font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('verify.upload_done')}
                    <button
                      type="button"
                      onClick={() => { setIdImageUrl(null); if (fileRef.current) fileRef.current.value = '' }}
                      className="ml-auto text-xs text-white/30 hover:text-white/60"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-dashed border-border rounded-xl text-sm text-white/40 hover:text-white/70 hover:border-white/20 transition-all disabled:opacity-40"
                  >
                    {uploadingFile
                      ? <><Loader2 className="w-4 h-4 animate-spin" />{t('verify.uploading')}</>
                      : <><Upload className="w-4 h-4" />{t('verify.id_upload')}</>
                    }
                  </button>
                )}
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
