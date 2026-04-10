'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, ChevronRight, Zap, BarChart2, Globe, DollarSign, Trash2, Pencil, Check, X, User } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n, LANGUAGES, type Locale } from '@/lib/i18n'
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/lib/currency'
import { supabase } from '@/lib/supabase'

export default function MyPage() {
  const { t, locale, setLocale } = useI18n()
  const { currency, setCurrency } = useCurrency()
  const router = useRouter()

  const [user, setUser] = useState<{ email: string; name: string; avatar: string } | null>(null)
  const [compareCount, setCompareCount] = useState<number | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCurrMenu, setShowCurrMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? ''
        setUser({
          email,
          name: data.user.user_metadata?.full_name ?? email ?? 'user',
          avatar: data.user.user_metadata?.avatar_url ?? '',
        })

        // 어드민 이메일이면 자동 pro
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
          .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
        if (adminEmails.includes(email.toLowerCase())) {
          setIsPro(true)
        } else {
          // 구독 상태 확인
          supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle()
            .then(({ data: sub }) => setIsPro(sub?.status === 'pro'))
        }

        // 실제 비교 횟수 조회
        supabase
          .from('comparison_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user.id)
          .then(({ count }) => setCompareCount(count ?? 0))

        supabase
          .from('profiles')
          .select('nickname')
          .eq('user_id', data.user.id)
          .maybeSingle()
          .then(({ data: p }) => setNickname(p?.nickname ?? null))
      }
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session?.access_token }),
      })
      if (!res.ok) throw new Error('delete failed')
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim()
    if (trimmed.length < 2) { setNicknameError('2자 이상 입력해주세요'); return }
    if (trimmed.length > 20) { setNicknameError('20자 이하로 입력해주세요'); return }
    setNicknameSaving(true); setNicknameError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNicknameSaving(false); return }
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, nickname: trimmed })
    if (error) {
      setNicknameError(error.code === '23505' ? '이미 사용 중인 닉네임입니다' : error.message)
      setNicknameSaving(false)
      return
    }
    setNickname(trimmed); setEditingNickname(false); setNicknameSaving(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === locale)
  const currentCurrency = CURRENCIES.find((c) => c.code === currency)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-black text-white mb-8">{t('mypage.title')}</h1>

          {/* Profile card */}
          <div className="bg-surface border border-border rounded-card p-6 mb-4">
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">
                    {(user?.name?.[0] ?? 'U').toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-bold text-white">{user?.name ?? '...'}</p>
                <p className="text-xs text-white/40">{user?.email ?? '...'}</p>
              </div>
            </div>
          </div>

          {/* Nickname */}
          <div className="bg-surface border border-border rounded-card p-5 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 mb-0.5">닉네임</p>
                  {editingNickname ? (
                    <input
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNicknameSave()}
                      maxLength={20}
                      autoFocus
                      className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-white/20 transition-colors w-40"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white">{nickname ?? '설정되지 않음'}</p>
                  )}
                  {nicknameError && <p className="text-xs text-red-400 mt-1">{nicknameError}</p>}
                </div>
              </div>
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingNickname(false); setNicknameError('') }} className="text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleNicknameSave} disabled={nicknameSaving} className="text-accent hover:text-accent/80 transition-colors disabled:opacity-40">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNicknameInput(nickname ?? ''); setEditingNickname(true); setNicknameError('') }}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mb-4">
            <div className="bg-surface border border-border rounded-card p-4 flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-white/40">{t('mypage.comparisons')}</p>
                <p className="text-xl font-black text-white">
                  {compareCount === null ? '...' : compareCount}
                </p>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className={`rounded-card p-5 mb-4 flex items-center justify-between ${
            isPro
              ? 'bg-gradient-to-r from-accent/20 to-transparent border border-accent/30'
              : 'bg-surface border border-border'
          }`}>
            <div>
              <p className="text-xs text-white/40 mb-1">{t('mypage.plan')}</p>
              <p className="text-lg font-black text-white flex items-center gap-2">
                {isPro ? (
                  <><Zap className="w-4 h-4 text-accent" /> {t('mypage.pro')}</>
                ) : (
                  t('mypage.free')
                )}
              </p>
            </div>
            {!isPro && (
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-light text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
              >
                <Zap className="w-3 h-3" />
                {t('mypage.upgrade')}
              </Link>
            )}
          </div>

          {/* Preferences */}
          <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs text-white/40 uppercase tracking-widest">{t('mypage.preferences')}</p>
            </div>

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => { setShowLangMenu(!showLangMenu); setShowCurrMenu(false) }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white">{t('mypage.language')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/50">{currentLang?.flag} {currentLang?.label}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${showLangMenu ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {showLangMenu && (
                <div className="border-b border-border bg-surface-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLocale(lang.code as Locale); setShowLangMenu(false) }}
                      className={`w-full flex items-center gap-3 px-8 py-3 text-sm transition-colors hover:bg-surface ${
                        locale === lang.code ? 'text-accent' : 'text-white/60'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                      <span className="ml-auto text-xs text-white/30">{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency */}
            <div className="relative">
              <button
                onClick={() => { setShowCurrMenu(!showCurrMenu); setShowLangMenu(false) }}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white">{t('mypage.currency')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/50">{currentCurrency?.flag} {currentCurrency?.code} {currentCurrency?.symbol}</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${showCurrMenu ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {showCurrMenu && (
                <div className="bg-surface-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code as CurrencyCode); setShowCurrMenu(false) }}
                      className={`w-full flex items-center gap-3 px-8 py-3 text-sm transition-colors hover:bg-surface ${
                        currency === c.code ? 'text-accent' : 'text-white/60'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span className="font-semibold">{c.symbol}</span>
                      <span>{c.code}</span>
                      <span className="ml-auto text-xs text-white/30">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 border border-border text-white/50 hover:text-white hover:border-white/20 font-semibold py-3 rounded-full transition-all text-sm mb-3"
          >
            <LogOut className="w-4 h-4" />
            {t('mypage.signout')}
          </button>

          {/* Delete account */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-500/60 hover:text-red-400 font-semibold py-3 rounded-full transition-all text-sm"
          >
            <Trash2 className="w-4 h-4" />
            {t('mypage.delete_account')}
          </button>
        </div>

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
            <div className="bg-surface border border-border rounded-card p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />
                <h2 className="text-lg font-black text-white">{t('mypage.delete_account')}</h2>
              </div>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                {t('mypage.delete_confirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-full border border-border text-white/60 hover:text-white text-sm font-semibold transition-colors"
                  disabled={isDeleting}
                >
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50"
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? (locale === 'ko' ? '삭제 중...' : 'Deleting...')
                    : (locale === 'ko' ? '탈퇴하기' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
