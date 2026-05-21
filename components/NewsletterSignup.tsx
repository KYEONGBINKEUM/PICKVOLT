'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

export default function NewsletterSignup() {
  const { t, locale } = useI18n()
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
        body: JSON.stringify({ email: email.trim(), locale }),
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
    <div className="w-full border-t border-border">
      <div className="w-full py-16 flex flex-col items-center gap-7 text-center px-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {t('newsletter.title')}
          </h2>
          <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
            {t('newsletter.subtitle')}
          </p>
        </div>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="text-accent">✓</span>
            {t('newsletter.success')}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <form onSubmit={handleSubmit} className="relative w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                placeholder={t('newsletter.placeholder')}
                required
                className="w-full bg-surface border border-border rounded-full px-5 py-3 pr-36 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40 whitespace-nowrap"
                style={{ background: 'rgb(255,77,0)' }}
              >
                {status === 'loading' ? '...' : t('newsletter.subscribe')}
              </button>
            </form>
            {(status === 'duplicate' || status === 'error') && (
              <p className="text-xs text-red-400/80">
                {status === 'duplicate' ? t('newsletter.duplicate') : t('newsletter.error')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
