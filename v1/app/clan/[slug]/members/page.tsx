'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Crown, Shield, User } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { imgUrl } from '@/lib/utils'

interface Member {
  user_id: string
  role: 'owner' | 'moderator' | 'member'
  status: 'approved' | 'pending'
  joined_at: string
  display_name: string
  profiles: { avatar_url: string | null } | null
}

export default function ClanMembersPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const { t } = useI18n()
  const router = useRouter()
  const [token, setToken]       = useState<string | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)
  const [myRole, setMyRole]     = useState<string | null>(null)
  const [ownerId, setOwnerId]   = useState<string | null>(null)
  const [members, setMembers]   = useState<Member[]>([])
  const [pending, setPending]   = useState<Member[]>([])
  const [loading, setLoading]   = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const tok = data.session?.access_token ?? null
      setToken(tok)
      setUserId(data.session?.user?.id ?? null)
      if (!tok) { setLoading(false); return }

      const clanRes = await fetch(`/api/clans/${slug}`, { headers: { Authorization: `Bearer ${tok}` } })
      if (!clanRes.ok) { setLoading(false); return }
      const clanJson = await clanRes.json()
      const role = clanJson.clan.my_membership?.role
      if (!role || !['owner', 'moderator'].includes(role)) { router.replace(`/clan/${slug}`); return }
      setMyRole(role)
      setOwnerId(clanJson.clan.owner_id)

      const [membersRes, pendingRes] = await Promise.all([
        fetch(`/api/clans/${slug}/members?status=approved`, { headers: { Authorization: `Bearer ${tok}` } }),
        fetch(`/api/clans/${slug}/members?status=pending`, { headers: { Authorization: `Bearer ${tok}` } }),
      ])
      const membersJson = await membersRes.json()
      const pendingJson = await pendingRes.json()
      setMembers(membersJson.members ?? [])
      setPending(pendingJson.members ?? [])
      setLoading(false)
    })
  }, [slug, router])

  const doAction = async (targetUserId: string, action: string) => {
    if (!token) return
    setActionLoading(`${targetUserId}-${action}`)
    const res = await fetch(`/api/clans/${slug}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: targetUserId, action }),
    })
    if (res.ok) {
      if (action === 'approve') {
        const approved = pending.find(m => m.user_id === targetUserId)
        if (approved) {
          setPending(prev => prev.filter(m => m.user_id !== targetUserId))
          setMembers(prev => [...prev, { ...approved, status: 'approved' }])
        }
      } else if (action === 'kick') {
        setMembers(prev => prev.filter(m => m.user_id !== targetUserId))
        setPending(prev => prev.filter(m => m.user_id !== targetUserId))
      } else if (action === 'promote') {
        setMembers(prev => prev.map(m => m.user_id === targetUserId ? { ...m, role: 'moderator' } : m))
      } else if (action === 'demote') {
        setMembers(prev => prev.map(m => m.user_id === targetUserId ? { ...m, role: 'member' } : m))
      }
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <div className="flex justify-center py-40"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      </div>
    )
  }

  const isOwner = ownerId === userId
  const RoleIcon = ({ role }: { role: string }) =>
    role === 'owner' ? <Crown className="w-3 h-3 text-amber-400" />
    : role === 'moderator' ? <Shield className="w-3 h-3 text-blue-400" />
    : <User className="w-3 h-3 text-white/25" />

  const MemberRow = ({ m, isPending }: { m: Member; isPending?: boolean }) => {
    const isActionLoading = (a: string) => actionLoading === `${m.user_id}-${a}`
    const canModify = m.role !== 'owner' && !(myRole === 'moderator' && m.role === 'moderator')
    return (
      <div className="flex items-center gap-3 py-3 px-4 hover:bg-white/[0.02] transition-colors">
        {m.profiles?.avatar_url
          ? <img src={imgUrl(m.profiles.avatar_url, 40)} alt={m.display_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white/30">{m.display_name[0]?.toUpperCase()}</span>
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-white/80 truncate">{m.display_name}</span>
            {!isPending && <RoleIcon role={m.role} />}
          </div>
          {!isPending && <span className="text-[11px] text-white/30">{t(`clan.role.${m.role}` as Parameters<typeof t>[0])}</span>}
        </div>
        {canModify && (
          <div className="flex items-center gap-2">
            {isPending && (
              <button onClick={() => doAction(m.user_id, 'approve')} disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-40">
                {isActionLoading('approve') ? <Loader2 className="w-3 h-3 animate-spin" /> : t('clan.approve')}
              </button>
            )}
            {isOwner && !isPending && m.role === 'member' && (
              <button onClick={() => doAction(m.user_id, 'promote')} disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg border border-border text-white/40 text-xs font-semibold hover:text-white hover:border-white/20 transition-colors disabled:opacity-40">
                {isActionLoading('promote') ? <Loader2 className="w-3 h-3 animate-spin" /> : t('clan.promote')}
              </button>
            )}
            {isOwner && !isPending && m.role === 'moderator' && (
              <button onClick={() => doAction(m.user_id, 'demote')} disabled={!!actionLoading}
                className="px-3 py-1.5 rounded-lg border border-border text-white/40 text-xs font-semibold hover:text-white hover:border-white/20 transition-colors disabled:opacity-40">
                {isActionLoading('demote') ? <Loader2 className="w-3 h-3 animate-spin" /> : t('clan.demote')}
              </button>
            )}
            <button onClick={() => doAction(m.user_id, 'kick')} disabled={!!actionLoading}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400/70 text-xs font-semibold hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-40">
              {isActionLoading('kick') ? <Loader2 className="w-3 h-3 animate-spin" /> : t('clan.kick')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/clan/${slug}`} className="text-white/25 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black text-white">{t('clan.members')}</h1>
        </div>

        {pending.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-4">{t('clan.pending_requests')} ({pending.length})</h2>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border/30">
              {pending.map(m => <MemberRow key={m.user_id} m={m} isPending />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 px-4">{t('clan.members')} ({members.length})</h2>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border/30">
            {members.map(m => <MemberRow key={m.user_id} m={m} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
