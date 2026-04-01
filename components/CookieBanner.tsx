'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Cookie } from 'lucide-react'

export default function CookieBanner() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('pv_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('pv_cookie_consent', 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('pv_cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-slide-up">
      <div className="bg-surface-2 border border-border rounded-card px-5 py-4 shadow-2xl shadow-black/50 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/60 leading-relaxed">
            {t('cookie.message')}{' '}
            <Link href="/cookies" className="text-white/80 underline hover:text-white transition-colors">
              {t('cookie.learn')}
            </Link>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-full border border-border hover:border-white/20 transition-all"
          >
            {t('cookie.decline')}
          </button>
          <button
            onClick={accept}
            className="text-xs font-semibold bg-accent hover:bg-accent-light text-white px-4 py-1.5 rounded-full transition-colors"
          >
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
