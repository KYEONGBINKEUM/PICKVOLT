'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { CATEGORY_I18N_KEY } from '@/lib/articleCategories'
import ArticleHeader from '@/components/articles/ArticleHeader'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

interface Draft {
  id: string
  slug: string
  title: string
  category: string
  summary: string
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export default function DraftsPage() {
  const { t, locale } = useI18n()
  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const token = sessionData.session?.access_token ?? null
      const { data: { user } } = await supabase.auth.getUser()
      const email = (user?.email ?? '').toLowerCase()
      const admin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)
      setAuthed(!!user)
      setIsAdmin(admin)
      setAuthReady(true)

      if (admin && token) {
        const res = await fetch('/api/admin/drafts', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (res.ok) setDrafts(data.items ?? [])
      }
      setLoading(false)
    })
  }, [])

  if (!authReady) return null

  if (!authed || !isAdmin) {
    return (
      <>
        <ArticleHeader />
        <div className="min-h-[50vh] flex items-center justify-center px-6">
          <div className="text-center max-w-sm flex flex-col items-center gap-3">
            <h1 className="text-lg font-bold text-white">
              {authed ? t('articleWrite.forbidden') : t('write.login_required')}
            </h1>
            {!authed && <Link href="/login" className="text-sm text-accent hover:underline mt-2">{t('auth.signin')}</Link>}
            <Link href="/" className="text-sm text-accent hover:underline mt-2">{t('articleWrite.back_home')}</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <ArticleHeader />
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '24px 20px 56px' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/40">
            <Link href="/" className="text-accent font-semibold">Pickvolt</Link>
            <span className="mx-1.5">›</span>
            {t('articleWrite.drafts_title')}
          </p>
          <Link
            href="/articles/write"
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent-light transition-colors"
          >
            {t('articleWrite.heading')}
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">…</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-white/40">{t('articleWrite.drafts_empty')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/articles/write?slug=${d.slug}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border hover:border-white/20 transition-colors"
              >
                {d.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnail_url} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg bg-surface-2 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{d.title || t('articleWrite.title_placeholder')}</p>
                  {d.summary && <p className="text-xs text-white/40 truncate mt-0.5">{d.summary}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {d.category && (
                      <span className="text-[11px] font-semibold text-accent/70">{t(CATEGORY_I18N_KEY[d.category] ?? d.category)}</span>
                    )}
                    <span className="text-[11px] text-white/30">
                      {t('articleWrite.drafts_updated')} {new Date(d.updated_at).toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
