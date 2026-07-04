'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import RichEditor, { RichEditorHandle } from '@/components/RichEditor'
import { ARTICLE_CATEGORIES, CATEGORY_I18N_KEY } from '@/lib/articleCategories'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
const CATEGORIES = ARTICLE_CATEGORIES

function WriteInner() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editSlug = searchParams.get('slug')

  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const [slug, setSlug] = useState<string | null>(editSlug)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [summary, setSummary] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [status, setStatus] = useState<'draft' | 'unlisted' | 'public'>('public')

  const [contentLoaded, setContentLoaded] = useState(!editSlug)
  const [publishPanelOpen, setPublishPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const editorRef = useRef<HTMLDivElement | null>(null)
  const richEditorRef = useRef<RichEditorHandle>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      const session = sessionData.session
      setToken(session?.access_token ?? null)
      const { data: { user } } = await supabase.auth.getUser()
      setAuthed(!!user)
      const email = (user?.email ?? '').toLowerCase()
      setIsAdmin(ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email))
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!editSlug || !token) return
    fetch(`/api/articles/${editSlug}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setSlug(data.slug)
        setTitle(data.title ?? '')
        setCategory(data.category ?? '')
        setTagsInput((data.tags ?? []).join(', '))
        setContentHtml(data.content_html ?? '')
        setSummary(data.summary ?? '')
        setThumbnailUrl(data.thumbnail_url ?? '')
      })
      .finally(() => setContentLoaded(true))
  }, [editSlug, token])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const buildPayload = () => ({
    title: title.trim(),
    category,
    summary: summary.trim(),
    content_html: contentHtml,
    tags: tagsInput.split(',').map((s) => s.trim()).filter(Boolean),
    thumbnail_url: thumbnailUrl.trim() || null,
  })

  const saveDraft = async (): Promise<string | null> => {
    if (!token) return null
    if (!title.trim() || !category) {
      setError('title/category required')
      return null
    }
    setSaving(true)
    setError('')
    try {
      if (!slug) {
        const res = await fetch('/api/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(buildPayload()),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'failed'); return null }
        setSlug(data.slug)
        return data.slug as string
      } else {
        const res = await fetch(`/api/articles/${slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(buildPayload()),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'failed'); return null }
        return slug
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDraftSave = async () => {
    const s = await saveDraft()
    if (s) showToast(t('articleWrite.draft_saved_toast'))
  }

  const handleConfirmPublish = async () => {
    if (!token) return
    setPublishing(true)
    setError('')
    try {
      const s = await saveDraft()
      if (!s) return
      const res = await fetch(`/api/articles/${s}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'failed'); return }
      router.push(`/articles/${s}`)
    } finally {
      setPublishing(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleDraftSave()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, category, summary, contentHtml, tagsInput, thumbnailUrl, slug, token])

  if (!authReady) return null

  if (!authed || !isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="text-center max-w-sm flex flex-col items-center gap-3">
          <h1 className="text-lg font-bold text-white">
            {authed ? t('articleWrite.forbidden') : t('write.login_required')}
          </h1>
          {!authed && <p className="text-sm text-white/40">{t('articleWrite.login_desc')}</p>}
          <Link href="/" className="text-sm text-accent hover:underline mt-2">{t('articleWrite.back_home')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-inner mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/40">
          <Link href="/" className="text-accent font-semibold">Pickvolt</Link>
          <span className="mx-1.5">›</span>
          {t('articleWrite.heading')}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDraftSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-border text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          >
            {t('articleWrite.draft_save')}
          </button>
          <button
            onClick={() => setPublishPanelOpen((v) => !v)}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent-light transition-colors"
          >
            {t('articleWrite.open_publish')}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg bg-surface border border-border text-white outline-none"
        >
          <option value="">{t('articleWrite.category_placeholder')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(CATEGORY_I18N_KEY[c])}</option>
          ))}
        </select>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={t('articleWrite.tags_placeholder')}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg bg-surface border border-border text-white placeholder:text-white/30 outline-none"
        />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('articleWrite.title_placeholder')}
        className="w-full mb-3 px-3 py-3 text-xl font-bold rounded-lg bg-surface border border-border text-white placeholder:text-white/25 outline-none"
      />

      {contentLoaded && (
        <RichEditor
          ref={richEditorRef}
          editorRef={editorRef}
          onChange={setContentHtml}
          token={token}
          placeholder={t('articleWrite.body_placeholder')}
          uploadSizeError={t('write.img_size_error')}
          uploadFailText={t('write.img_upload_fail')}
          urlPrompt={t('write.toolbar.url')}
          initialHtml={contentHtml}
          minHeight="360px"
          bucket="article-images"
        />
      )}

      {publishPanelOpen && (
        <div className="mt-6 p-6 rounded-2xl bg-surface border border-border">
          <h3 className="text-sm font-bold text-white mb-4">{t('articleWrite.publish_settings')}</h3>

          <p className="text-xs font-semibold text-white/40 mb-2">{t('articleWrite.status_label')}</p>
          <div className="flex gap-5 mb-4">
            {(['public', 'unlisted', 'draft'] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm text-white/80 cursor-pointer">
                <input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} />
                {t(`articleWrite.status_${s}`)}
              </label>
            ))}
          </div>

          <label className="block text-xs font-semibold text-white/40 mb-1.5">{t('articleWrite.thumbnail_url')}</label>
          <input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full mb-4 px-3 py-2 text-sm rounded-lg bg-background border border-border text-white placeholder:text-white/25 outline-none"
          />

          <label className="block text-xs font-semibold text-white/40 mb-1.5">{t('articleWrite.seo_summary')}</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full mb-5 px-3 py-2 text-sm rounded-lg bg-background border border-border text-white placeholder:text-white/25 outline-none resize-y"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setPublishPanelOpen(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-border text-white/70 hover:text-white transition-colors"
            >
              {t('write.cancel')}
            </button>
            <button
              onClick={handleConfirmPublish}
              disabled={publishing}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent-light transition-colors disabled:opacity-40"
            >
              {t('articleWrite.confirm_publish')}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-black border border-border text-white text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}

export default function ArticleWritePage() {
  return (
    <Suspense fallback={null}>
      <WriteInner />
    </Suspense>
  )
}
