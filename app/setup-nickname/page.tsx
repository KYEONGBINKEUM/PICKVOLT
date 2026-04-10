'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function SetupNicknamePage() {
  const router = useRouter()
  const { t } = useI18n()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [dupStatus, setDupStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) router.replace('/mypage')
      else setChecking(false)
    })
  }, [router])

  const checkDuplicate = (value: string) => {
    const trimmed = value.trim()
    if (trimmed.length < 2) { setDupStatus('idle'); return }
    setDupStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('nickname', trimmed)
        .maybeSingle()
      setDupStatus(data ? 'taken' : 'available')
    }, 400)
  }

  const handleChange = (value: string) => {
    setNickname(value)
    setError('')
    checkDuplicate(value)
  }

  const handleSubmit = async () => {
    const trimmed = nickname.trim()
    if (trimmed.length < 2) { setError(t('nickname.error_short')); return }
    if (trimmed.length > 20) { setError(t('nickname.error_long')); return }
    if (dupStatus === 'taken') { setError(t('nickname.error_taken')); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { error: err } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, nickname: trimmed })
    if (err) {
      setError(err.code === '23505' ? t('nickname.error_taken') : err.message)
      setLoading(false)
      return
    }
    router.replace('/mypage')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <Link href="/" className="flex items-center gap-2 mb-12">
        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="font-bold text-white text-base">pickvolt</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="bg-surface border border-border rounded-card p-8">
          <h1 className="text-3xl font-black text-white mb-2">{t('nickname.title')}</h1>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">{t('nickname.sub')}</p>

          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={t('nickname.placeholder')}
                maxLength={20}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/20 transition-colors pr-24"
              />
              {nickname.trim().length >= 2 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${
                  dupStatus === 'available' ? 'text-green-400' :
                  dupStatus === 'taken' ? 'text-red-400' :
                  'text-white/30'
                }`}>
                  {dupStatus === 'checking' ? t('nickname.checking') :
                   dupStatus === 'available' ? t('nickname.available') :
                   dupStatus === 'taken' ? t('nickname.error_taken') : ''}
                </span>
              )}
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <p className="mt-2 text-xs text-white/20 text-right">{nickname.length} / 20</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || nickname.trim().length < 2 || dupStatus === 'taken' || dupStatus === 'checking'}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold py-3.5 rounded-full transition-colors text-sm"
          >
            {loading ? t('nickname.saving') : t('nickname.submit')}
          </button>
        </div>
      </div>
    </main>
  )
}
