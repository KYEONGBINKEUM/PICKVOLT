'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut, ChevronRight, Zap, BarChart2, Globe, Trash2, Pencil, Check, X, User, Camera, MessageSquare, Heart, Star, Coins, ChevronDown, FileText, BadgeCheck, Smartphone, Plus, Search, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n, LANGUAGES, type Locale } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'

function MyPageContent() {
  const { t, locale, setLocale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromCommunity = searchParams.get('from') === 'community'

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
  const [myDevices, setMyDevices] = useState<{
    id: string; product_id: string
    product: { id: string; name: string; brand: string; category: string; image_url: string | null } | null
  }[]>([])
  const [showDeviceSearch, setShowDeviceSearch] = useState(false)
  const [deviceQuery, setDeviceQuery] = useState('')
  const [deviceResults, setDeviceResults] = useState<{ id: string; name: string; brand: string; image_url: string | null }[]>([])
  const [deviceSearching, setDeviceSearching] = useState(false)
  const deviceSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showLangMenu, setShowLangMenu] = useState(false)
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

  // 커뮤니티 활동
  const [myPosts, setMyPosts] = useState<{ id: string; title: string; type: string; upvotes: number; comment_count: number; created_at: string }[]>([])
  const [myComments, setMyComments] = useState<{ id: string; body: string; created_at: string; post_id: string; community_posts: { id: string; title: string } | null }[]>([])

  // 포인트 & 설정
  const [points, setPoints] = useState<number | null>(null)
  const [autoAiEnabled, setAutoAiEnabled] = useState(true)
  const [autoAiSaving, setAutoAiSaving] = useState(false)
  const [bonusToast, setBonusToast] = useState<{ points: number } | null>(null)
  const [showPointsHistory, setShowPointsHistory] = useState(false)
  const [transactions, setTransactions] = useState<{ id: string; amount: number; reason: string; created_at: string }[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // ── 내 기기 검색 ────────────────────────────────────────────────
  useEffect(() => {
    if (deviceSearchTimer.current) clearTimeout(deviceSearchTimer.current)
    if (deviceQuery.trim().length < 2) { setDeviceResults([]); return }
    deviceSearchTimer.current = setTimeout(() => {
      setDeviceSearching(true)
      fetch(`/api/products/search?q=${encodeURIComponent(deviceQuery)}&limit=8`)
        .then(r => r.json())
        .then(d => setDeviceResults((d.results ?? []).filter((p: { id: string }) => !myDevices.find(dv => dv.product_id === p.id))))
        .finally(() => setDeviceSearching(false))
    }, 300)
    return () => { if (deviceSearchTimer.current) clearTimeout(deviceSearchTimer.current) }
  }, [deviceQuery, myDevices])

  const addDevice = async (p: { id: string; name: string; brand: string; image_url: string | null }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/user/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ product_id: p.id }),
    })
    if (res.ok) {
      const j = await res.json()
      setMyDevices(prev => [{ id: j.device.id, product_id: p.id, product: p as { id: string; name: string; brand: string; category: string; image_url: string | null } }, ...prev])
    }
    setDeviceQuery(''); setDeviceResults([]); setShowDeviceSearch(false)
  }

  const removeDevice = async (productId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`/api/user/devices?product_id=${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    setMyDevices(prev => prev.filter(d => d.product_id !== productId))
  }

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
          supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', data.user.id)
            .maybeSingle()
            .then(({ data: sub }) => setIsPro(sub?.status === 'pro'))
        }

        supabase
          .from('comparison_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user.id)
          .then(({ count }) => setCompareCount(count ?? 0))

        supabase
          .from('profiles')
          .select('nickname, avatar_url, locale, currency')
          .eq('user_id', data.user.id)
          .maybeSingle()
          .then(({ data: p }) => {
            setNickname(p?.nickname ?? null)
            setAvatarUrl(p?.avatar_url ?? null)
            // 저장된 언어/통화 적용
            if (p?.locale) {
              try { setLocale(p.locale as import('@/lib/i18n').Locale) } catch {}
            }
          })

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) return
          const token = session.access_token

          fetch('/api/reviews/my', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => setMyReviews(j.reviews ?? []))
          fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => setWishlist(j.wishlist ?? []))
          fetch('/api/user/devices', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => setMyDevices(j.devices ?? []))
            .catch(() => {})
          fetch('/api/community/my-activity', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json()).then((j) => { setMyPosts(j.posts ?? []); setMyComments(j.comments ?? []) })
            .catch(() => {})

          // 포인트 & 설정 로드
          fetch('/api/user/points', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => {
              setPoints(d.points ?? 0)
              setAutoAiEnabled(d.auto_ai_enabled ?? true)
            })
            .catch(() => {})

          // 일일 로그인 보너스 수령 시도
          fetch('/api/user/login-bonus', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.claimed) {
                setPoints(d.points)
                setBonusToast({ points: d.points })
                setTimeout(() => setBonusToast(null), 3500)
              }
            })
            .catch(() => {})

          // 포인트 내역 로드
          fetch('/api/user/transactions', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => setTransactions(d.transactions ?? []))
            .catch(() => {})
        })
      }
    })
  }, [])

  const handleOpenPointsHistory = async () => {
    setShowPointsHistory(true)
    if (transactions.length > 0) return  // already loaded
    setTxLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setTxLoading(false); return }
    fetch('/api/user/transactions', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .catch(() => {})
      .finally(() => setTxLoading(false))
  }

  const reasonLabel = (reason: string) => {
    if (reason === 'signup_bonus')           return t('point.reason_signup_bonus')
    if (reason === 'daily_login')            return t('point.reason_daily_login')
    if (reason === 'ai_comparison')          return t('point.reason_ai_comparison')
    if (reason === 'post_unlock_spent')      return t('point.reason_post_unlock_spent')
    if (reason === 'post_unlock_received')   return t('point.reason_post_unlock_received')
    return reason
  }

  const handleAutoAiToggle = async () => {
    const next = !autoAiEnabled
    setAutoAiEnabled(next)
    setAutoAiSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAutoAiSaving(false); return }
    await fetch('/api/user/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ auto_ai_enabled: next }),
    })
    setAutoAiSaving(false)
  }

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

  const resizeImage = (file: File, maxSize = 256): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('resize failed')),
          'image/webp',
          0.85
        )
      }
      img.onerror = reject
      img.src = url
    })

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError('')

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setAvatarError(t('avatar.error_type')); return }

    setAvatarUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAvatarUploading(false); return }

    let uploadBlob: Blob
    try {
      uploadBlob = await resizeImage(file, 256)
    } catch {
      setAvatarError(t('avatar.error_upload'))
      setAvatarUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', new File([uploadBlob], 'avatar.webp', { type: 'image/webp' }))
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

  return (
    <>
      <Navbar communityContext={fromCommunity} />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* 일일 로그인 보너스 토스트 */}
        {bonusToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-up">
            <div className="bg-accent text-white rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <p className="font-bold text-sm">{t('mypage.bonus_toast').replace('{points}', String(bonusToast.points))}</p>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto">
          <h1 className="text-4xl font-black text-white mb-8">{t('mypage.title')}</h1>

          {/* Profile card */}
          <div className="bg-surface border border-border rounded-card p-6 mb-4">
            <div className="flex items-center gap-4">
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

          {/* Stats + Points row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 총 비교 횟수 */}
            <div className="bg-surface border border-border rounded-card p-4 flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-accent flex-shrink-0" />
              <div>
                <p className="text-xs text-white/40">{t('mypage.comparisons')}</p>
                <p className="text-xl font-black text-white">
                  {compareCount === null ? '...' : compareCount}
                </p>
              </div>
            </div>

            {/* 포인트 잔액 — 클릭 시 내역 모달 */}
            <button
              onClick={handleOpenPointsHistory}
              className="bg-surface border border-accent/20 rounded-card p-4 flex items-center gap-3 text-left hover:border-accent/50 transition-colors"
            >
              <Coins className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40">{t('mypage.points')}</p>
                <p className="text-xl font-black text-accent">
                  {points === null ? '...' : `${points}`}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/30" />
            </button>
          </div>

          {/* ── 내 기기 ── */}
          <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Smartphone className="w-4 h-4" style={{ color: 'rgb(255,77,0)' }} />
              <p className="text-sm font-bold text-white">
                {t('mydevices.title')}
                {myDevices.length > 0 && (
                  <span className="text-white/30 font-normal text-xs ml-1">{myDevices.length}{t('mypage.count_unit')}</span>
                )}
              </p>
              <button
                onClick={() => { setShowDeviceSearch(v => !v); setDeviceQuery(''); setDeviceResults([]) }}
                className="ml-auto flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('mydevices.add')}
              </button>
            </div>

            {/* 기기 검색 패널 */}
            {showDeviceSearch && (
              <div className="px-4 pt-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2.5 mb-2">
                  <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  <input
                    autoFocus
                    value={deviceQuery}
                    onChange={e => setDeviceQuery(e.target.value)}
                    placeholder={t('write.product_search')}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                  />
                  {deviceSearching && <Loader2 className="w-3 h-3 text-white/30 animate-spin shrink-0" />}
                </div>
                {deviceResults.length > 0 && (
                  <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                    {deviceResults.map(p => (
                      <button key={p.id} onClick={() => addDevice(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                        <div className="w-9 h-9 rounded-lg bg-surface flex-shrink-0 overflow-hidden relative">
                          {p.image_url
                            ? <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" unoptimized />
                            : <span className="w-full h-full flex items-center justify-center text-xs font-black text-white/15">{p.brand?.[0]}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                          <p className="text-[10px] text-white/30">{p.brand}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {myDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-5">
                <Smartphone className="w-6 h-6 text-white/10 mb-2" />
                <p className="text-xs text-white/25">{t('mydevices.empty')}</p>
                <p className="text-[10px] text-white/15 mt-0.5">{t('mydevices.empty_sub')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {myDevices.map(dv => {
                  const p = dv.product
                  if (!p) return null
                  return (
                    <div key={dv.id} className="flex items-center gap-3 px-5 py-3">
                      <Link href={`/product/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-xl bg-surface-2 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {p.image_url
                            ? <Image src={p.image_url} alt={p.name} width={40} height={40} className="object-contain w-full h-full" unoptimized />
                            : <span className="text-white/20 text-xs font-bold">{p.brand?.[0]}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/30 truncate">{p.brand}</p>
                          <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        </div>
                      </Link>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(255,77,0,0.12)', color: 'rgb(255,77,0)' }}>
                        {t('mydevices.using')}
                      </span>
                      <button onClick={() => removeDevice(dv.product_id)}
                        className="text-white/20 hover:text-white/60 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 찜 목록 */}
          {wishlist.length > 0 && (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                <p className="text-sm font-bold text-white">{t('mypage.wishlist_heading')} <span className="text-white/30 font-normal text-xs ml-1">{wishlist.length}{t('mypage.count_unit')}</span></p>
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
                <p className="text-sm font-bold text-white">{t('mypage.my_reviews_heading')} <span className="text-white/30 font-normal text-xs ml-1">{myReviews.length}{t('mypage.count_unit')}</span></p>
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

          {/* Plan — 비활성화
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
          */}

          {/* 내 커뮤니티 게시글 */}
          {myPosts.length > 0 && (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <FileText className="w-4 h-4 text-white/40" />
                <p className="text-sm font-bold text-white">{t('mypage.my_posts_heading')} <span className="text-white/30 font-normal text-xs ml-1">{myPosts.length}{t('mypage.count_unit')}</span></p>
              </div>
              <div className="divide-y divide-border">
                {myPosts.map((p) => (
                  <Link key={p.id} href={`/community/posts/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-accent/60 mb-0.5">{t(`community.${p.type}`)}</p>
                      <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">↑{p.upvotes} · {p.comment_count}{t('mypage.comment_unit')}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 내 댓글 */}
          {myComments.length > 0 && (
            <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <MessageSquare className="w-4 h-4 text-white/40" />
                <p className="text-sm font-bold text-white">{t('mypage.my_comments_heading')} <span className="text-white/30 font-normal text-xs ml-1">{myComments.length}{t('mypage.count_unit')}</span></p>
              </div>
              <div className="divide-y divide-border">
                {myComments.map((c) => (
                  <Link key={c.id} href={`/community/posts/${c.post_id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      {c.community_posts && (
                        <p className="text-[10px] text-white/30 truncate mb-0.5">↳ {c.community_posts.title}</p>
                      )}
                      <p className="text-sm text-white/70 line-clamp-2">{c.body.replace(/<[^>]+>/g, ' ').trim()}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Preferences */}
          <div className="bg-surface border border-border rounded-card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs text-white/40 uppercase tracking-widest">{t('mypage.preferences')}</p>
            </div>

            {/* AI 자동 분석 토글 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-white/40" />
                <div>
                  <p className="text-sm text-white">{t('mypage.auto_ai')}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {autoAiEnabled ? t('mypage.auto_ai_on_desc') : t('mypage.auto_ai_off_desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAutoAiToggle}
                disabled={autoAiSaving}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50 ${
                  autoAiEnabled ? 'bg-accent' : 'bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    autoAiEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
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

          </div>

          {/* Verify */}
          <Link
            href="/mypage/verify"
            className="w-full flex items-center justify-center gap-2 border border-border text-white/50 hover:text-white hover:border-white/20 font-semibold py-3 rounded-full transition-all text-sm mb-3"
          >
            <BadgeCheck className="w-4 h-4" />
            {t('mypage.verify')}
          </Link>

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

        {/* 포인트 내역 모달 */}
        {showPointsHistory && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-0 sm:pb-6"
            onClick={() => setShowPointsHistory(false)}
          >
            <div
              className="bg-surface border border-border rounded-t-2xl sm:rounded-card w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold text-white">{t('mypage.points_history_title')}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-accent">{points ?? 0}</span>
                  <button onClick={() => setShowPointsHistory(false)} className="text-white/30 hover:text-white transition-colors text-lg leading-none">✕</button>
                </div>
              </div>
              {/* 내역 목록 */}
              <div className="max-h-80 overflow-y-auto">
                {txLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                      ))}
                    </div>
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-10">{t('mypage.points_history_empty')}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm text-white">{reasonLabel(tx.reason)}</p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? `+${tx.amount}` : `${tx.amount}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

export default function MyPage() {
  return (
    <Suspense>
      <MyPageContent />
    </Suspense>
  )
}
