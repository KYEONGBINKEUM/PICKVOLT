'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')

    async function handleCallback() {
      let userId: string | null = null

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { router.replace('/login'); return }
        userId = data.session?.user.id ?? null
      } else {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.replace('/login'); return }
        userId = session.user.id
      }

      if (!userId) { router.replace('/login'); return }

      // 프로필 존재 여부 확인
      const { data: profileBase } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!profileBase) {
        router.replace('/setup-nickname')
        return
      }

      // country 컬럼 확인 (마이그레이션 여부 무관하게 안전하게 처리)
      const { data: profileFull } = await supabase
        .from('profiles')
        .select('country')
        .eq('user_id', userId)
        .maybeSingle()

      if (!profileFull?.country) {
        router.replace('/setup-preferences')
      } else {
        router.replace('/mypage')
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-white/40">signing you in...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
