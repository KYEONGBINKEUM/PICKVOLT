'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Plus, X, AlertTriangle, Camera, ImagePlus } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

async function uploadImage(file: File, userId: string, type: 'avatar' | 'banner'): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${type}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('clan-assets').upload(path, file)
  if (error) return null
  const { data } = supabase.storage.from('clan-assets').getPublicUrl(path)
  return data.publicUrl
}

export default function ClanSettingsPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { t } = useI18n()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
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
  const [writePerm, setWritePerm] = useState<'everyone' | 'moderator' | 'owner'>('everyone')
  const [rules, setRules]         = useState<string[]>([])
  const [newRule, setNewRule]     = useState('')
  const [clanName, setClanName]   = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      setUserId(data.session?.user?.id ?? null)
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
      setWritePerm(c.write_permission ?? 'everyone')
      setRules(Array.isArray(c.rules) ? c.rules : [])
      setAvatarUrl(c.avatar_url ?? null)
      setBannerUrl(c.banner_url ?? null)
      setAvatarPreview(c.avatar_url ?? null)
      setBannerPreview(c.banner_url ?? null)
      setLoading(false)
    })
  }, [slug, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert(t('write.img_size_error')); return }
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file))
  }
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert(t('write.img_size_error')); return }
    setBannerFile(file); setBannerPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!token || !userId) return
    setSaving(true); setSaved(false)
    let finalAvatarUrl = avatarUrl
    let finalBannerUrl = bannerUrl
    if (avatarFile) finalAvatarUrl = await uploadImage(avatarFile, userId, 'avatar')
    if (bannerFile) finalBannerUrl = await uploadImage(bannerFile, userId, 'banner')
    await fetch(`/api/clans/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, description, join_type: joinType, is_private: isPrivate, write_permission: writePerm, rules, avatar_url: finalAvatarUrl, banner_url: finalBannerUrl }),
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

          {/* 배너 */}
          <div>
            <p className={labelCls}>{t('clan.banner')}</p>
            <div
              className="relative w-full h-28 rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerPreview
                ? <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><ImagePlus className="w-7 h-7 text-white/20" /></div>
              }
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            <p className="text-[11px] text-white/25 mt-1 px-1">{t('clan.banner_hint')}</p>
          </div>

          {/* 아이콘 + 이름 */}
          <div className="flex items-end gap-4">
            <div>
              <p className={labelCls}>{t('clan.avatar')}</p>
              <div
                className="relative w-16 h-16 rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-white/20" /></div>
                }
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <p className="text-[10px] text-white/25 mt-1 text-center">{t('clan.avatar_hint')}</p>
            </div>
            <div className="flex-1">
              <p className={labelCls}>{t('clan.name')}</p>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
            </div>
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

              <div>
                <p className={labelCls}>{t('clan.write_permission')}</p>
                <div className="flex flex-col gap-2">
                  {(['everyone', 'moderator', 'owner'] as const).map(perm => (
                    <button key={perm} type="button" onClick={() => setWritePerm(perm)}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all ${
                        writePerm === perm ? 'border-accent bg-accent/10 text-white' : 'border-border text-white/40 hover:border-white/20'
                      }`}>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all flex items-center justify-center ${writePerm === perm ? 'border-accent bg-accent' : 'border-white/30'}`}>
                        {writePerm === perm && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </span>
                      <span className="text-sm font-semibold">{t(`clan.write_perm.${perm}` as Parameters<typeof t>[0])}</span>
                    </button>
                  ))}
                </div>
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
