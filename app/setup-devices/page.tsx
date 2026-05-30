'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, X, Loader2, Smartphone, Check } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

interface ProductResult {
  id: string
  name: string
  brand: string
  category: string
  image_url: string | null
}

export default function SetupDevicesPage() {
  const router = useRouter()
  const { t } = useI18n()

  const [token, setToken] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [devices, setDevices] = useState<ProductResult[]>([])
  const [saving, setSaving] = useState(false)

  // 검색
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      const { data: { session } } = await supabase.auth.getSession()
      setToken(session?.access_token ?? null)

      // 이미 등록된 기기 로드
      if (session?.access_token) {
        fetch('/api/user/devices', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then(r => r.json())
          .then(d => {
            setDevices((d.devices ?? []).map((dv: { product: ProductResult }) => dv.product).filter(Boolean))
          })
          .catch(() => {})
      }
      setChecking(false)
    })
  }, [router])

  // 제품 검색
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (query.trim().length < 2) { setResults([]); return }
    searchTimer.current = setTimeout(() => {
      setSearching(true)
      fetch(`/api/products/search?q=${encodeURIComponent(query)}&limit=8`)
        .then(r => r.json())
        .then(d => setResults((d.results ?? []).filter((p: ProductResult) => !devices.find(dv => dv.id === p.id))))
        .finally(() => setSearching(false))
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [query, devices])

  const addDevice = (p: ProductResult) => {
    if (devices.find(d => d.id === p.id)) return
    setDevices(prev => [...prev, p])
    setQuery('')
    setResults([])
  }

  const removeDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  const handleDone = async () => {
    if (!token) { router.replace('/mypage'); return }
    setSaving(true)
    try {
      // 현재 저장된 기기 목록 조회
      const existing = await fetch('/api/user/devices', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => (d.devices ?? []).map((dv: { product_id: string }) => dv.product_id) as string[])

      const toAdd = devices.filter(d => !existing.includes(d.id))
      const toRemove = existing.filter((id: string) => !devices.find(d => d.id === id))

      await Promise.all([
        ...toAdd.map(d =>
          fetch('/api/user/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ product_id: d.id }),
          })
        ),
        ...toRemove.map((id: string) =>
          fetch(`/api/user/devices?product_id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        ),
      ])
    } finally {
      setSaving(false)
      router.replace('/mypage')
    }
  }

  const handleSkip = () => router.replace('/mypage')

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-start px-4 pt-16 pb-20">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="font-bold text-white text-base">pickvolt</span>
      </Link>

      {/* Step dots — step 4 of 4 */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`h-1 rounded-full transition-all ${s < 4 ? 'w-4 bg-accent/50' : 'w-8 bg-accent'}`} />
        ))}
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-1.5">
          <Smartphone className="w-5 h-5" style={{ color: 'rgb(255,77,0)' }} />
          <h1 className="text-3xl font-black text-white">{t('setup.devices_heading')}</h1>
        </div>
        <p className="text-sm text-white/40 mb-8 leading-relaxed">{t('setup.devices_sub')}</p>

        {/* 검색 */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-3 focus-within:border-white/20 transition-colors">
            <Search className="w-4 h-4 text-white/30 shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('write.product_search')}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
            />
            {searching && <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" />}
          </div>

          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-xl overflow-hidden z-10 shadow-2xl">
              {results.map(p => (
                <button key={p.id} onClick={() => addDevice(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left">
                  {p.image_url ? (
                    <div className="w-10 h-10 rounded-lg bg-surface-2 flex-shrink-0 overflow-hidden relative">
                      <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" unoptimized />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-black text-white/20">{p.brand?.[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                    <p className="text-[10px] text-white/30">{p.brand}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 등록된 기기 목록 */}
        {devices.length > 0 ? (
          <div className="space-y-2 mb-8">
            {devices.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl px-3 py-2.5">
                {d.image_url ? (
                  <div className="w-10 h-10 rounded-lg bg-surface-2 flex-shrink-0 overflow-hidden relative">
                    <Image src={d.image_url} alt={d.name} fill className="object-contain p-1" unoptimized />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/85 truncate">{d.name}</p>
                  <p className="text-[10px] text-white/35">{d.brand}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,77,0,0.12)', color: 'rgb(255,77,0)' }}>
                    <Check className="w-2.5 h-2.5" /> {t('mydevices.using')}
                  </span>
                  <button onClick={() => removeDevice(d.id)}
                    className="text-white/25 hover:text-white/60 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 mb-8 border border-dashed border-border rounded-xl">
            <Smartphone className="w-8 h-8 text-white/10 mb-2" />
            <p className="text-sm text-white/25">{t('mydevices.empty')}</p>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleDone}
          disabled={saving}
          className="w-full py-3.5 rounded-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold text-sm transition-colors mb-3"
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            : devices.length > 0 ? t('setup.devices_done') : t('setup.devices_skip')
          }
        </button>
        <button onClick={handleSkip}
          className="w-full py-2.5 text-xs text-white/30 hover:text-white/60 transition-colors">
          {t('setup.devices_skip')}
        </button>
      </div>
    </main>
  )
}
