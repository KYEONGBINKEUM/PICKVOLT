'use client'

import { useState, useEffect, useRef } from 'react'
import { Flag, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

const REASONS = ['spam', 'hate', 'sexual', 'violence', 'privacy', 'false_info', 'other'] as const

interface Props {
  targetType: 'post' | 'comment' | 'clan'
  targetId: string
  token: string | null
  /** trigger element className override */
  triggerClassName?: string
  /** 아이콘만 표시 (텍스트 숨김) */
  iconOnly?: boolean
}

export default function ReportModal({ targetType, targetId, token, triggerClassName, iconOnly }: Props) {
  const { t } = useI18n()
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState('')
  const [done, setDone]     = useState(false)
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const reset = () => { setReason(''); setDetail(''); setDone(false); setLoading(false) }

  const handleOpen = () => {
    if (!token) return
    reset()
    setOpen(true)
  }

  const submit = async () => {
    if (!reason || !token) return
    setLoading(true)
    await fetch('/api/community/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, detail: detail.trim() || null }),
    })
    setDone(true)
    setLoading(false)
    setTimeout(() => setOpen(false), 1500)
  }

  if (!token) return null

  return (
    <>
      <button
        onClick={handleOpen}
        title={t('report.btn')}
        className={triggerClassName ?? 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-white/30 hover:text-red-400 hover:border-red-500/40 transition-colors text-xs'}
      >
        <Flag className="w-3.5 h-3.5" />
        {!iconOnly && t('report.btn')}
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                <span className="font-bold text-white">{t('report.title')}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="px-5 py-8 text-center">
                <p className="text-emerald-400 font-semibold">{t('report.done')}</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {/* 신고 유형 */}
                <div>
                  <p className="text-xs text-white/40 mb-2 font-medium">{t('report.reason_label')}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REASONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                          reason === r
                            ? 'border-red-500/60 bg-red-500/10 text-red-300'
                            : 'border-border text-white/50 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {t(`report.reason.${r}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 상세 내용 */}
                <div>
                  <p className="text-xs text-white/40 mb-2 font-medium">{t('report.detail_label')}</p>
                  <textarea
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                    placeholder={t('report.detail_placeholder')}
                    rows={3}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={!reason || loading}
                  className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                >
                  {loading ? '...' : t('report.submit')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
