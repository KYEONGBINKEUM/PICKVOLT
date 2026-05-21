'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

export default function NewsletterSignup() {
  const { t } = useI18n()
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        const data = await res.json()
        setStatus(data.error === 'duplicate' ? 'duplicate' : 'error')
      }
    } catch {
      setStatus('error')
    }
  }

  const message =
    status === 'success'   ? t('newsletter.success')   :
    status === 'duplicate' ? t('newsletter.duplicate') :
    status === 'error'     ? t('newsletter.error')     : null

  return (
    <section className="w-full max-w-xl mx-auto px-6 py-12">
      <div className="bg-surface border border-border rounded-2xl px-7 py-8 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-black text-white leading-tight">
            {t('newsletter.title')}
          </h2>
          <p className="text-sm text-white/40 mt-1.5">
            {t('newsletter.subtitle')}
          </p>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <span className="text-base">✓</span>
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
              placeholder={t('newsletter.placeholder')}
              required
              className="flex-1 bg-surface-2 border border-border rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent/50 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-accent hover:bg-accent/90 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'loading' ? '...' : t('newsletter.subscribe')}
            </button>
          </form>
        )}

        {message && status !== 'success' && (
          <p className="text-xs text-red-400">{message}</p>
        )}
      </div>
    </section>
  )
}
