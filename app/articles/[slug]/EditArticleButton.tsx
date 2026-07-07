'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export default function EditArticleButton({ slug }: { slug: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = (session?.user?.email ?? '').toLowerCase()
      if (ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)) {
        setIsAdmin(true)
        setToken(session?.access_token ?? null)
      }
    })
  }, [])

  if (!isAdmin) return null

  const handleDelete = async () => {
    if (!window.confirm(t('articleWrite.delete_confirm'))) return
    if (!token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/articles/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        router.push('/')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 24, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <Link
        href={`/articles/write?slug=${slug}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          color: '#EDEDED', background: '#1A1A1A', border: '1px solid #2A2A2A',
          padding: '8px 16px', textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}
        className="pv-fab-edit"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4l4 4L6 17H2v-4L11 4z" /><line x1="14" y1="5" x2="16" y2="3" />
        </svg>
        {t('articleWrite.edit_this')}
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
          color: '#fff', background: '#c0392b', border: 'none',
          padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)', opacity: deleting ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
        className="pv-fab-delete"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 17 6" /><path d="M8 6V4h4v2" /><path d="M6 6l1 12h6l1-12" />
        </svg>
        {deleting ? '...' : t('articleWrite.delete_this')}
      </button>
      <style>{`
        .pv-fab-edit:hover { border-color: #FF4D00 !important; color: #FF4D00 !important; }
        .pv-fab-delete:hover { background: #a93226 !important; }
      `}</style>
    </div>
  )
}
