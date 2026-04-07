'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

interface Product {
  id: string
  name: string
  brand: string
  category: string
  image_url: string | null
  price_usd: number | null
  source_url: string | null
  scrape_status: string | null
}

const CATEGORIES = ['laptop', 'smartphone', 'tablet', 'monitor']
const SCRAPE_STATUSES = ['ok', 'pending', 'error']

export default function ProductEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [authed, setAuthed] = useState(false)
  const [token, setToken] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>({})
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = (session?.user?.email ?? '').toLowerCase()
      if (!session) { router.replace('/login'); return }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) { router.replace('/'); return }
      setToken(session.access_token)
      setAuthed(true)
    })
  }, [router])

  // Load product
  useEffect(() => {
    if (!authed) return
    supabase
      .from('products')
      .select('id, name, brand, category, image_url, price_usd, source_url, scrape_status')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProduct(data)
          setForm(data)
          setImagePreview(data.image_url ?? '')
        }
      })
  }, [authed, id])

  const patch = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'image_url') setImagePreview(String(value ?? ''))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ type: 'ok', text: '저장됨' })
        setProduct((p) => p ? { ...p, ...form } : p)
      } else {
        setMessage({ type: 'err', text: json.error ?? '오류' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const json = await res.json()
      if (res.ok && json.image_url) {
        patch('image_url', json.image_url)
        setMessage({ type: 'ok', text: '이미지 업로드 완료' })
      } else {
        setMessage({ type: 'err', text: json.error ?? '업로드 오류' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setUploading(false)
    }
  }

  if (!authed || !product) {
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
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} />
            관리자
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 truncate max-w-xs">{product.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {product.source_url && (
            <a href={product.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ExternalLink size={13} />
              소스
            </a>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            저장
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        {/* 이미지 섹션 */}
        <div className="bg-surface border border-border rounded-card p-6">
          <h2 className="font-semibold text-white mb-4">이미지</h2>
          <div className="flex gap-6">
            {/* 미리보기 */}
            <div className="flex-shrink-0 w-32 h-32 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                />
              ) : (
                <span className="text-white/20 text-xs">미리보기</span>
              )}
            </div>

            <div className="flex-1 space-y-3">
              {/* URL 직접 입력 */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5">이미지 URL</label>
                <input
                  type="text"
                  value={form.image_url ?? ''}
                  onChange={(e) => patch('image_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {/* 파일 업로드 */}
              <div>
                <label className="block text-xs text-white/40 mb-1.5">또는 파일 업로드</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-sm text-white/60 hover:text-white disabled:opacity-40 transition-colors"
                >
                  {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? '업로드 중...' : '이미지 선택'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-surface border border-border rounded-card p-6">
          <h2 className="font-semibold text-white mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">제품명</label>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => patch('name', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">브랜드</label>
              <input
                type="text"
                value={form.brand ?? ''}
                onChange={(e) => patch('brand', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">카테고리</label>
              <select
                value={form.category ?? ''}
                onChange={(e) => patch('category', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">가격 (USD)</label>
              <input
                type="number"
                value={form.price_usd ?? ''}
                onChange={(e) => patch('price_usd', e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">스크랩 상태</label>
              <select
                value={form.scrape_status ?? ''}
                onChange={(e) => patch('scrape_status', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                {SCRAPE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">소스 URL</label>
              <input
                type="text"
                value={form.source_url ?? ''}
                onChange={(e) => patch('source_url', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* 저장 버튼 (하단) */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-black font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
