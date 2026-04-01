'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="font-bold text-white text-base">pickvolt</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-card p-8">
          <h1 className="text-3xl font-black text-white mb-2">{t('auth.heading')}</h1>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">{t('auth.sub')}</p>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black font-semibold py-3.5 rounded-full transition-colors text-sm disabled:opacity-60"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {t('auth.google')}
          </button>

          {error && (
            <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
          )}

          {/* Terms */}
          <p className="mt-6 text-xs text-white/30 text-center leading-relaxed">
            {t('auth.terms')}{' '}
            <Link href="/terms" className="text-white/50 hover:text-white underline transition-colors">
              {t('auth.terms_link')}
            </Link>
            {' '}&amp;{' '}
            <Link href="/privacy" className="text-white/50 hover:text-white underline transition-colors">
              {t('auth.privacy_link')}
            </Link>
            {' '}{t('auth.terms_agree')}
          </p>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-xs text-white/30 hover:text-white transition-colors">
            ← {t('auth.back')}
          </Link>
        </p>
      </div>
    </main>
  )
}
