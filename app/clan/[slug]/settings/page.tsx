'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Plus, X, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export default function ClanSettingsPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { t } = useI18n()
  const router = useRouter()
  const [token, setToken]     = useState<string | null>(null)
  const [userId, setUserId]   = useState<string | null>(null)
  const [clanId, setClanId]   = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const [name, setName]           = useState('')
  const [description, setDescription] = useState('')
  const [joinType, setJoinType]   = useState<'auto' | 'approval'>('auto')
  const [isPrivate, setIsPrivate] = useState(false)
  const [rules, setRules]         = useState<string[]>([])
  const [newRule, setNewRule]     = useState('')
  const [clanName, setClanName]   = useState('') // for delete confirm

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
      if (!tok) { setLoading(false); return }

      const res = await fetch(`/api/clans/${slug}`, { headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      const c = json.clan
      const role = c.my_membership?.role
      if (!role || !['owner', 'moderator'].includes(role)) { router.replace(`/clan/${slug}`); return }

      setClanId(c.id)
      setOwnerId(c.owner_id)
      setName(c.name)
      setClanName(c.name)
      setDescription(c.description ?? '')
      setJoinType(c.join_type)
      setIsPrivate(c.is_private)
      setRules(Array.isArray(c.rules) ? c.rules : [])
      setLoading(false)
    })
  }, [slug, router])

  const handleSave = async () => {
    if (!token) return
    setSaving(true); setSaved(false)
    await fetch(`/api/clans/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description, join_type: joinType, is_private: isPrivate, rules }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleDelete = async () => {
    if (!token || deleteConfirm !== clanName) return
    setDeleting(true)
    const res = await fetch(`/api/clans/${slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) router.push('/clan')
    else setDeleting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex justify-center py-40"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      </div>
    )
  }

  const isOwner = ownerId === userId
  const labelCls = 'text-xs font-bold text-white/40 mb-2 uppercase tracking-widest'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[560px] mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/clan/${slug}`} className="text-white/25 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-white">{t('clan.settings')}</h1>
        </div>

        <div className="space-y-6">
          <div>
            <p className={labelCls}>{t('clan.name')}</p>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
          </div>

          <div>
            <p className={labelCls}>{t('clan.description')}</p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors resize-none" />
          </div>

          {isOwner && (
            <>
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

              <div>
                <button type="button" onClick={() => setIsPrivate(v => !v)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${isPrivate ? 'border-accent/40 bg-accent/5' : 'border-border'}`}>
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${isPrivate ? 'border-accent bg-accent' : 'border-white/30'}`}>
                    {isPrivate && <span className="text-white text-[9px] font-black">✓</span>}
                  </span>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${isPrivate ? 'text-white' : 'text-white/50'}`}>{t('clan.is_private')}</p>
                    <p className="text-[11px] text-white/30">{t('clan.is_private_desc')}</p>
                  </div>
                </button>
              </div>
            </>
          )}

          <div>
            <p className={labelCls}>{t('clan.rules')}</p>
            <div className="space-y-2 mb-2">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
                  <span className="text-xs text-white/30 font-bold flex-shrink-0">{i + 1}.</span>
                  <p className="flex-1 text-sm text-white/70">{rule}</p>
                  <button onClick={() => setRules(prev => prev.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {rules.length < 10 && (
              <div className="flex gap-2">
                <input value={newRule} onChange={e => setNewRule(e.target.value)} maxLength={120}
                  onKeyDown={e => { if (e.key === 'Enter' && newRule.trim()) { setRules(p => [...p, newRule.trim()]); setNewRule('') } }}
                  placeholder={t('clan.rule_ph')}
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
                <button type="button" onClick={() => { if (newRule.trim()) { setRules(p => [...p, newRule.trim()]); setNewRule('') } }}
                  className="px-4 py-2.5 bg-surface border border-border rounded-xl text-white/50 hover:text-white hover:border-white/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {saved && <p className="text-sm text-green-400">{t('clan.saved')}</p>}

          <div className="flex gap-3 pt-2">
            <Link href={`/clan/${slug}`} className="px-6 py-3 rounded-xl border border-border text-white/35 text-sm hover:text-white/70 hover:border-white/15 transition-colors">
              {t('write.cancel')}
            </Link>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('clan.save')}
            </button>
          </div>

          {/* Danger zone — owner only */}
          {isOwner && (
            <div className="border border-red-500/20 rounded-2xl p-5 mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-red-400">{t('clan.delete')}</h3>
              </div>
              <p className="text-xs text-white/40">{t('clan.delete_confirm')}</p>
              <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={clanName}
                className="w-full bg-surface border border-red-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-red-500/40 transition-colors" />
              <button onClick={handleDelete} disabled={deleting || deleteConfirm !== clanName}
                className="w-full py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 disabled:opacity-40 text-red-400 font-bold text-sm transition-all flex items-center justify-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('clan.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
