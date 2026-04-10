'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function SetupAvatarPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [checking, setChecking] = useState(true)
  const [nickname, setNickname] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!data) { router.replace('/setup-nickname'); return }
      setNickname(data.nickname ?? '')
      setChecking(false)
    })
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setError('')

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(selected.type)) {
      setError(t('avatar.error_type'))
      return
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError(t('avatar.error_size'))
      return
    }

    setFile(selected)
    const url = URL.createObjectURL(selected)
    setPreview(url)
  }

  const handleUpload = async () => {
    if (!file) {
      // 사진 없이 저장 (기본값 유지)
      router.replace('/mypage')
      return
    }

    setUploading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/user/avatar', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })

    if (!res.ok) {
      setError(t('avatar.error_upload'))
      setUploading(false)
      return
    }

    router.replace('/mypage')
  }

  const handleSkip = () => {
    router.replace('/mypage')
  }

  const initial = nickname?.[0]?.toUpperCase() ?? 'U'

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
          <h1 className="text-3xl font-black text-white mb-2">{t('avatar.title')}</h1>
          <p className="text-sm text-white/40 mb-8 leading-relaxed">{t('avatar.sub')}</p>

          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-white/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-accent font-black text-3xl">{initial}</span>
                )}
              </div>

              {preview ? (
                <button
                  onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-accent hover:text-accent/80 transition-colors font-semibold"
            >
              {t('avatar.upload')}
            </button>
          </div>

          {error && <p className="mb-4 text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold py-3.5 rounded-full transition-colors text-sm mb-3"
          >
            {uploading ? t('avatar.uploading') : t('nickname.submit')}
          </button>

          <button
            onClick={handleSkip}
            className="w-full text-white/30 hover:text-white/60 transition-colors text-sm py-2"
          >
            {t('avatar.skip')}
          </button>
        </div>
      </div>
    </main>
  )
}
