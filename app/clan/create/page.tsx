'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function ClanCreatePage() {
  const { t } = useI18n()
  const router = useRouter()
  const [token, setToken]     = useState<string | null>(null)
  const [authed, setAuthed]   = useState<boolean | null>(null)
  const [name, setName]       = useState('')
  const [slug, setSlug]       = useState('')
  const [description, setDescription] = useState('')
  const [joinType, setJoinType] = useState<'auto' | 'approval'>('auto')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setToken(data.session?.access_token ?? null)
      const { data: { user } } = await supabase.auth.getUser()
      setAuthed(!!user)
    })
  }, [])

  const handleNameChange = (v: string) => {
    setName(v)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-')) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-'))
    }
  }

  const handleSubmit = async () => {
    if (!token || !name.trim() || !slug.trim()) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, join_type: joinType }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error === 'slug_taken' ? t('clan.slug') + ' — taken' : json.error ?? 'error')
        return
      }
      router.push(`/clan/${json.slug}`)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (authed === false) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <p className="text-white/40 text-sm">{t('write.login_required')}</p>
          <Link href="/login" className="bg-accent text-white text-sm font-bold px-6 py-2.5 rounded-xl">{t('auth.signin')}</Link>
        </div>
      </div>
    )
  }

  const labelCls = 'text-xs font-bold text-white/40 mb-2 uppercase tracking-widest'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[560px] mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clan" className="text-white/25 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-white">{t('clan.create')}</h1>
        </div>

        <div className="space-y-6">
          <div>
            <p className={labelCls}>{t('clan.name')}</p>
            <input value={name} onChange={e => handleNameChange(e.target.value)} maxLength={40}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
              placeholder={t('clan.name')} />
          </div>

          <div>
            <p className={labelCls}>{t('clan.slug')}</p>
            <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
              <span className="text-sm text-white/30">c/</span>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={30}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                placeholder="my-clan" />
            </div>
            <p className="text-[11px] text-white/25 mt-1 px-1">{t('clan.slug_desc')}</p>
          </div>

          <div>
            <p className={labelCls}>{t('clan.description')}</p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors resize-none"
              placeholder={t('clan.description')} />
          </div>

          <div>
            <p className={labelCls}>{t('clan.join_type')}</p>
            <div className="flex gap-3">
              {(['auto', 'approval'] as const).map(jt => (
                <button key={jt} type="button" onClick={() => setJoinType(jt)}
                  className={`flex-1 py-3 rounded-xl border text-xs font-semibold transition-all text-left px-4 ${
                    joinType === jt ? 'border-accent bg-accent/10 text-white' : 'border-border text-white/40 hover:border-white/20'
                  }`}>
                  {t(jt === 'auto' ? 'clan.join_auto' : 'clan.join_approval')}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-4 py-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link href="/clan" className="px-6 py-3 rounded-xl border border-border text-white/35 text-sm hover:text-white/70 hover:border-white/15 transition-colors">
              {t('write.cancel')}
            </Link>
            <button onClick={handleSubmit} disabled={submitting || !name.trim() || !slug.trim() || authed === null}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t('setup.saving') : t('clan.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
