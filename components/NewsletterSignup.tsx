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

  return (
    <div className="w-full border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-widest text-accent uppercase mb-1.5">
            Newsletter
          </p>
          <h2 className="text-base font-bold text-white leading-snug">
            {t('newsletter.title')}
          </h2>
          <p className="text-sm text-white/35 mt-0.5">
            {t('newsletter.subtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="flex-shrink-0 w-full sm:w-80">
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <span>✓</span>
              {t('newsletter.success')}
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                  placeholder={t('newsletter.placeholder')}
                  required
                  className="flex-1 min-w-0 bg-surface-2 border border-border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-accent hover:bg-accent/90 text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {status === 'loading' ? '...' : t('newsletter.subscribe')}
                </button>
              </form>
              {(status === 'duplicate' || status === 'error') && (
                <p className="mt-2 text-xs text-red-400">
                  {status === 'duplicate' ? t('newsletter.duplicate') : t('newsletter.error')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
