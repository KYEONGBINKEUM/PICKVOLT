'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, ChevronRight, Zap, BarChart2, Globe, DollarSign, Trash2, Pencil, Check, X, User, Camera, MessageSquare, Heart, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n, LANGUAGES, type Locale } from '@/lib/i18n'
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/lib/currency'
import { supabase } from '@/lib/supabase'

export default function MyPage() {
  const { t, locale, setLocale } = useI18n()
  const { currency, setCurrency } = useCurrency()
  const router = useRouter()

  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [compareCount, setCompareCount] = useState<number | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [myReviews, setMyReviews] = useState<{
    id: string; content: string; rating: number; created_at: string
    products: { id: string; name: string; brand: string; category: string; image_url: string | null } | null
  }[]>([])
  const [wishlist, setWishlist] = useState<{
    id: string; product_id: string; created_at: string
    products: { id: string; name: string; brand: string; category: string; image_url: string | null; price_usd: number | null } | null
  }[]>([])
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showCurrMenu, setShowCurrMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarFileRef = useRef<HTMLInputElement>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameDupStatus, setNicknameDupStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const nicknameDupRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email ?? ''
        setUser({
          email,
          name: data.user.user_metadata?.full_name ?? email ?? 'user',
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
          .select('nickname, avatar_url')
          .eq('user_id', data.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            setNickname(p?.nickname ?? null)
            setAvatarUrl(p?.avatar_url ?? null)
          })

        // 내 리뷰 + 찜 목록 (토큰 필요)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return
          const token = session.access_token
          fetch('/api/reviews/my', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => setMyReviews(j.reviews ?? []))
          fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => setWishlist(j.wishlist ?? []))
        })
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setAvatarError(t('avatar.error_type')); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError(t('avatar.error_size')); return }

    setAvatarUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAvatarUploading(false); return }

    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/user/avatar', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })

    if (!res.ok) {
      setAvatarError(t('avatar.error_upload'))
    } else {
      const json = await res.json()
      setAvatarUrl(json.avatar_url + `?t=${Date.now()}`)
    }
    setAvatarUploading(false)
    if (e.target) e.target.value = ''
  }

  const handleAvatarRemove = async () => {
    setAvatarUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAvatarUploading(false); return }
    await fetch('/api/user/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setAvatarUrl(null)
    setAvatarUploading(false)
  }

  const handleNicknameInputChange = (value: string) => {
    setNicknameInput(value)
    setNicknameError('')
    const trimmed = value.trim()
    if (trimmed.length < 2 || trimmed === nickname) { setNicknameDupStatus('idle'); return }
    setNicknameDupStatus('checking')
    if (nicknameDupRef.current) clearTimeout(nicknameDupRef.current)
    nicknameDupRef.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('user_id').ilike('nickname', trimmed).maybeSingle()
      setNicknameDupStatus(data ? 'taken' : 'available')
    }, 400)
  }

  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim()
    if (trimmed.length < 2) { setNicknameError(t('nickname.error_short')); return }
    if (trimmed.length > 20) { setNicknameError(t('nickname.error_long')); return }
    if (nicknameDupStatus === 'taken') { setNicknameError(t('nickname.error_taken')); return }
    setNicknameSaving(true); setNicknameError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNicknameSaving(false); return }
    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, nickname: trimmed })
    if (error) {
      setNicknameError(error.code === '23505' ? t('nickname.error_taken') : error.message)
      setNicknameSaving(false)
      return
    }
    setNickname(trimmed); setEditingNickname(false); setNicknameSaving(false); setNicknameDupStatus('idle')
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
              {/* Avatar with change button */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={nickname ?? user?.name ?? ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-accent font-bold text-xl">
                      {(nickname?.[0] ?? user?.name?.[0] ?? 'U').toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center disabled:opacity-50"
                >
                  <Camera className="w-3 h-3 text-white" />
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{user?.name ?? '...'}</p>
                <p className="text-xs text-white/40 truncate">{user?.email ?? '...'}</p>
                {avatarUrl && (
                  <button onClick={handleAvatarRemove} disabled={avatarUploading} className="text-[10px] text-white/30 hover:text-white/50 transition-colors mt-0.5 disabled:opacity-40">
                    {t('avatar.remove')}
                  </button>
                )}
              </div>
              {avatarUploading && (
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
            {avatarError && <p className="mt-3 text-xs text-red-400">{avatarError}</p>}
          </div>

          {/* Nickname */}
          <div className="bg-surface border border-border rounded-card p-5 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40 mb-0.5">{t('mypage.nickname')}</p>
                  {editingNickname ? (
                    <div className="flex flex-col gap-1">
                      <input
                        value={nicknameInput}
                        onChange={(e) => handleNicknameInputChange(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNicknameSave()}
                        maxLength={20}
                        autoFocus
                        className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-white/20 transition-colors w-40"
                      />
                      {nicknameInput.trim().length >= 2 && nicknameInput.trim() !== nickname && (
                        <span className={`text-[10px] font-semibold ${
                          nicknameDupStatus === 'available' ? 'text-green-400' :
                          nicknameDupStatus === 'taken' ? 'text-red-400' : 'text-white/30'
                        }`}>
                          {nicknameDupStatus === 'checking' ? t('nickname.checking') :
                           nicknameDupStatus === 'available' ? t('nickname.available') :
                           nicknameDupStatus === 'taken' ? t('nickname.error_taken') : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-white">{nickname ?? t('mypage.nickname_unset')}</p>
                  )}
                  {nicknameError && <p className="text-xs text-red-400 mt-1">{nicknameError}</p>}
                </div>
              </div>
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingNickname(false); setNicknameError(''); setNicknameDupStatus('idle') }} className="text-white/30 hover:text-white/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={handleNicknameSave} disabled={nicknameSaving || nicknameDupStatus === 'taken' || nicknameDupStatus === 'checking'} className="text-accent hover:text-accent/80 transition-colors disabled:opacity-40">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNicknameInput(nickname ?? ''); setEditingNickname(true); setNicknameError(''); setNicknameDupStatus('idle') }}
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

          {/* 찜 목록 */}
          {wishlist.length > 0 && (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                <p className="text-sm font-bold text-white">찜한 제품 <span className="text-white/30 font-normal text-xs ml-1">{wishlist.length}개</span></p>
              </div>
              <div className="divide-y divide-border">
                {wishlist.map((w) => {
                  const p = w.products
                  if (!p) return null
                  return (
                    <Link key={w.id} href={`/product/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} width={40} height={40} className="object-contain w-full h-full" unoptimized />
                        ) : (
                          <span className="text-white/20 text-xs font-bold">{p.brand?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/30 truncate">{p.brand}</p>
                        <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        {p.price_usd && <p className="text-xs text-accent font-bold">${Number(p.price_usd).toLocaleString()}</p>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* 내가 쓴 리뷰 */}
          {myReviews.length > 0 && (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <MessageSquare className="w-4 h-4 text-white/40" />
                <p className="text-sm font-bold text-white">내가 쓴 리뷰 <span className="text-white/30 font-normal text-xs ml-1">{myReviews.length}개</span></p>
              </div>
              <div className="divide-y divide-border">
                {myReviews.map((r) => {
                  const p = r.products
                  if (!p) return null
                  return (
                    <Link key={r.id} href={`/product/${p.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} width={40} height={40} className="object-contain w-full h-full" unoptimized />
                        ) : (
                          <span className="text-white/20 text-xs font-bold">{p.brand?.[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Star className="w-3 h-3 text-accent fill-accent" />
                            <span className="text-xs font-bold text-accent">{r.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{r.content}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

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
