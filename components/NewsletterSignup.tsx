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
    <div className="w-full border-t border-border">
      <div
        className="w-full py-16 flex flex-col items-center gap-7 text-center px-6"
        style={{
          background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,77,0,0.07) 0%, transparent 70%)',
        }}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {t('newsletter.title')}
          </h2>
          <p className="text-sm text-white/40 max-w-xs mx-auto leading-relaxed">
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
            <form
              onSubmit={handleSubmit}
              className="flex w-full rounded-xl overflow-hidden border border-border bg-surface focus-within:border-white/20 transition-colors"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                placeholder={t('newsletter.placeholder')}
                required
                className="flex-1 min-w-0 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-5 py-3 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 border-l border-border whitespace-nowrap"
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
