'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SetupNicknamePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

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

  const handleSubmit = async () => {
    const trimmed = nickname.trim()
    if (trimmed.length < 2) { setError('2자 이상 입력해주세요'); return }
    if (trimmed.length > 20) { setError('20자 이하로 입력해주세요'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { error: err } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, nickname: trimmed })
    if (err) {
      if (err.code === '23505') setError('이미 사용 중인 닉네임입니다')
      else setError(err.message)
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
          <h1 className="text-3xl font-black text-white mb-2">닉네임 설정</h1>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">
            리뷰에 표시될 닉네임을 정해주세요.<br />나중에 마이페이지에서 변경할 수 있어요.
          </p>

          <div className="mb-6">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="닉네임 (2~20자)"
              maxLength={20}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-white/20 transition-colors"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <p className="mt-2 text-xs text-white/20 text-right">{nickname.length} / 20</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || nickname.trim().length < 2}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold py-3.5 rounded-full transition-colors text-sm"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </div>
      </div>
    </main>
  )
}
