'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // 해시 fragment에서 토큰 추출 후 세션 설정
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/mypage')
      } else {
        // hash fragment 처리
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.replace('/mypage')
          }
        })
      }
    })
  }, [router])

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
