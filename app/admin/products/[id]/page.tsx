'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Search, Link2, Plus, X, Zap, Copy, Layers, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES = ['laptop', 'smartphone', 'tablet', 'smartwatch', 'headphones', 'monitor', 'tv', 'car']
// Categories that use CPU/GPU/RAM/OS/Wi-Fi in specs_common
const ELECTRONICS_CATS = ['smartphone', 'tablet', 'smartwatch']
const SCRAPE_STATUSES = ['ok', 'pending', 'failed', 'partial']
const STORAGE_TYPES = ['SSD', 'HDD', 'eMMC', 'UFS']
const DISPLAY_TYPES = ['IPS', 'OLED', 'AMOLED', 'LTPO OLED', 'VA', 'TN', 'Mini-LED', 'Liquid Retina']
const BRANDS = [
  // 스마트폰/태블릿
  'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Huawei', 'Motorola', 'OnePlus', 'Google', 'Realme', 'Sony', 'Nokia',
  // 노트북
  'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'LG', 'Razer', 'MSI', 'Toshiba',
  // 헤드폰/모니터/TV
  'Bose', 'Sony', 'Sennheiser', 'Audio-Technica', 'JBL', 'AKG', 'Jabra', 'Bang & Olufsen',
  'LG', 'Samsung', 'ASUS', 'BenQ', 'Dell', 'AOC', 'ViewSonic',
  // 자동차
  'Tesla', 'BMW', 'Mercedes-Benz', 'Audi', 'Toyota', 'Hyundai', 'Kia', 'Ford', 'Volkswagen', 'Volvo', 'Porsche', 'BYD',
]

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
    />
  )
}

function NumberInput({ value, onChange, step }: { value: number | null; onChange: (v: number | null) => void; step?: string }) {
  return (
    <input
      type="number"
      step={step ?? '1'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
    />
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
    >
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        value ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-background border-border text-white/40 hover:border-white/30'
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${value ? 'bg-accent border-accent' : 'border-white/30'}`} />
      {label}
    </button>
  )
}

function SectionCard({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <h2 className="font-semibold text-white">{title}</h2>
        {open ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}

// ── Variants Section ──────────────────────────────────────────────────────────

interface Variant {
  id: string
  variant_name: string
  cpu_name: string | null
  cpu_id: string | null
  gpu_name: string | null
  gpu_id: string | null
  ram_gb: string | null
  storage_gb: string | null
  price_usd: number | null
  source_url: string | null
  amazon_url: string | null
  sort_order: number
  is_default: boolean
}

type VariantForm = Omit<Variant, 'id' | 'sort_order' | 'is_default'>

const EMPTY_FORM: VariantForm = {
  variant_name: '', cpu_name: null, cpu_id: null,
  gpu_name: null, gpu_id: null, ram_gb: null, storage_gb: null,
  price_usd: null, source_url: null, amazon_url: null,
}

function VariantsSection({
  productId, token, isLaptop, baseSpecs, onSaveBase,
}: {
  productId: string; token: string
  isLaptop?: boolean
  baseSpecs?: {
    cpu_name: string | null; cpu_id: string | null
    gpu_name: string | null; gpu_id: string | null
    ram_gb: string | null; storage_gb: string | null
    price_usd: number | null; amazon_url: string | null
  }
  onSaveBase?: (base: VariantForm) => Promise<{ ok: boolean; error?: string }>
}) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBase, setEditingBase] = useState(false)
  const [addingNew, setAddingNew] = useState(false)
  const [form, setForm] = useState<VariantForm>(EMPTY_FORM)
  const [cpuQuery, setCpuQuery] = useState('')
  const [cpuResults, setCpuResults] = useState<{ id: string; name: string; relative_score: number | null }[]>([])
  const [cpuSearchOpen, setCpuSearchOpen] = useState(false)
  const [gpuQuery, setGpuQuery] = useState('')
  const [gpuResults, setGpuResults] = useState<{ id: string; name: string; relative_score: number | null }[]>([])
  const [gpuSearchOpen, setGpuSearchOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cpuTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gpuTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVariants = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/products/${productId}/variants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    setVariants(json.variants ?? [])
    setLoading(false)
  }, [productId, token])

  useEffect(() => { fetchVariants() }, [fetchVariants])

  const searchCpus = (q: string) => {
    if (cpuTimer.current) clearTimeout(cpuTimer.current)
    if (!q.trim()) { setCpuResults([]); return }
    cpuTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/cpus?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setCpuResults((json.cpus ?? []).map((c: { id: string; name: string; relative_score: number | null }) => ({
        id: c.id, name: c.name, relative_score: c.relative_score
      })))
    }, 300)
  }

  const searchGpus = (q: string) => {
    if (gpuTimer.current) clearTimeout(gpuTimer.current)
    if (!q.trim()) { setGpuResults([]); return }
    gpuTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/gpus?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setGpuResults((json.gpus ?? []).map((g: { id: string; name: string; relative_score: number | null }) => ({
        id: g.id, name: g.name, relative_score: g.relative_score
      })))
    }, 300)
  }

  const startEdit = (v: Variant) => {
    setEditingId(v.id)
    setAddingNew(false)
    setForm({
      variant_name: v.variant_name,
      cpu_name: v.cpu_name, cpu_id: v.cpu_id,
      gpu_name: v.gpu_name, gpu_id: v.gpu_id,
      ram_gb: v.ram_gb, storage_gb: v.storage_gb,
      price_usd: v.price_usd, source_url: v.source_url,
      amazon_url: v.amazon_url,
    })
    setCpuQuery(''); setGpuQuery(''); setCpuSearchOpen(false); setGpuSearchOpen(false)
    setCpuResults([]); setGpuResults([])
  }

  const startAdd = () => {
    setAddingNew(true); setEditingId(null); setEditingBase(false)
    setForm(EMPTY_FORM)
    setCpuQuery(''); setGpuQuery(''); setCpuSearchOpen(false); setGpuSearchOpen(false)
    setCpuResults([]); setGpuResults([])
  }

  const startEditBase = () => {
    if (!baseSpecs) return
    setEditingBase(true); setEditingId(null); setAddingNew(false)
    setForm({
      variant_name: '기본 옵션',
      cpu_name: baseSpecs.cpu_name, cpu_id: baseSpecs.cpu_id,
      gpu_name: baseSpecs.gpu_name, gpu_id: baseSpecs.gpu_id,
      ram_gb: baseSpecs.ram_gb, storage_gb: baseSpecs.storage_gb,
      price_usd: baseSpecs.price_usd, source_url: null,
      amazon_url: baseSpecs.amazon_url,
    })
    setCpuQuery(''); setGpuQuery(''); setCpuSearchOpen(false); setGpuSearchOpen(false)
    setCpuResults([]); setGpuResults([])
  }

  const cancelEdit = () => {
    setEditingId(null); setAddingNew(false); setEditingBase(false)
    setCpuSearchOpen(false); setGpuSearchOpen(false)
  }

  const handleSave = async () => {
    if (editingBase && onSaveBase) {
      setErr(null)
      setSaving('base')
      try {
        const result = await onSaveBase(form)
        if (!result.ok) { setErr(result.error ?? '오류'); return }
        cancelEdit()
      } finally {
        setSaving(null)
      }
      return
    }
    setErr(null)
    const autoName = [form.cpu_name, form.gpu_name].filter(Boolean).join(' + ')
      || (form.ram_gb ? `${form.ram_gb}GB RAM` : null)
      || `옵션 ${variants.length + 1}`
    const payload = { ...form, variant_name: autoName }
    setSaving(editingId ?? 'new')
    try {
      let res: Response
      if (editingId) {
        res = await fetch(`/api/admin/products/${productId}/variants`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ variantId: editingId, ...payload }),
        })
      } else {
        res = await fetch(`/api/admin/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...payload, sort_order: variants.length }),
        })
      }
      if (!res.ok) { const j = await res.json(); setErr(j.error ?? '오류'); return }
      await fetchVariants()
      cancelEdit()
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (variantId: string, name: string) => {
    if (!confirm(`"${name}" 옵션을 삭제하시겠어요?`)) return
    setSaving(variantId)
    const res = await fetch(`/api/admin/products/${productId}/variants?variantId=${variantId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await fetchVariants()
    setSaving(null)
  }

  const handleSetDefault = async (variantId: string) => {
    setSaving(variantId)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ variantId, is_default: true }),
      })
      if (res.ok) {
        await fetchVariants()
      } else {
        const json = await res.json().catch(() => ({}))
        setErr(json.error ?? '기본 옵션 설정에 실패했습니다')
      }
    } catch {
      setErr('네트워크 오류가 발생했습니다')
    } finally {
      setSaving(null)
    }
  }

  const pf = (field: keyof VariantForm, value: unknown) =>
    setForm((p) => ({ ...p, [field]: value }))

  const isEditing = editingId !== null || addingNew || editingBase

  const VariantFormUI = (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-background/50 mt-3">
      {err && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{err}</p>}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CPU */}
        <div>
          <label className="block text-xs text-white/40 mb-1">CPU</label>
          <div className="flex gap-2 mb-1">
            <div className="flex items-center gap-2 bg-white/5 border border-border rounded-lg px-3 py-1.5 flex-1 min-w-0">
              {form.cpu_id
                ? <><Link2 size={12} className="text-accent flex-shrink-0" /><span className="text-xs text-white truncate">{form.cpu_name}</span><button onClick={() => pf('cpu_id', null)} className="ml-auto text-white/20 hover:text-red-400 flex-shrink-0"><X size={11} /></button></>
                : <span className="text-xs text-white/30">{form.cpu_name || '미연결'}</span>
              }
            </div>
            <button onClick={() => { setCpuSearchOpen((o) => !o); setCpuQuery(''); setCpuResults([]) }}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white/5 border border-border rounded-lg text-xs text-white/50 hover:text-white transition-colors">
              <Search size={11} />
            </button>
          </div>
          {cpuSearchOpen && (
            <div className="bg-background border border-border rounded-xl p-2 mb-1">
              <input type="text" value={cpuQuery} placeholder="CPU 검색..."
                onChange={(e) => { setCpuQuery(e.target.value); searchCpus(e.target.value) }}
                autoFocus
                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent mb-1.5"
              />
              {cpuResults.map((c) => (
                <button key={c.id} onClick={() => { pf('cpu_id', c.id); pf('cpu_name', c.name); setCpuSearchOpen(false); setCpuResults([]) }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left mb-0.5">
                  <span className="text-xs text-white">{c.name}</span>
                  {c.relative_score != null && <span className="text-[10px] text-accent">score {c.relative_score}</span>}
                </button>
              ))}
              {!cpuQuery.trim() && <p className="text-[10px] text-white/20 text-center py-1">CPU 이름 입력</p>}
            </div>
          )}
          <input type="text" value={form.cpu_name ?? ''}
            onChange={(e) => pf('cpu_name', e.target.value || null)}
            placeholder="CPU 이름 직접 입력 (선택)"
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* GPU */}
        <div>
          <label className="block text-xs text-white/40 mb-1">GPU</label>
          <div className="flex gap-2 mb-1">
            <div className="flex items-center gap-2 bg-white/5 border border-border rounded-lg px-3 py-1.5 flex-1 min-w-0">
              {form.gpu_id
                ? <><Link2 size={12} className="text-purple-400 flex-shrink-0" /><span className="text-xs text-white truncate">{form.gpu_name}</span><button onClick={() => pf('gpu_id', null)} className="ml-auto text-white/20 hover:text-red-400 flex-shrink-0"><X size={11} /></button></>
                : <span className="text-xs text-white/30">{form.gpu_name || '미연결'}</span>
              }
            </div>
            <button onClick={() => { setGpuSearchOpen((o) => !o); setGpuQuery(''); setGpuResults([]) }}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white/5 border border-border rounded-lg text-xs text-white/50 hover:text-white transition-colors">
              <Search size={11} />
            </button>
          </div>
          {gpuSearchOpen && (
            <div className="bg-background border border-border rounded-xl p-2 mb-1">
              <input type="text" value={gpuQuery} placeholder="GPU 검색..."
                onChange={(e) => { setGpuQuery(e.target.value); searchGpus(e.target.value) }}
                autoFocus
                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent mb-1.5"
              />
              {gpuResults.map((g) => (
                <button key={g.id} onClick={() => { pf('gpu_id', g.id); pf('gpu_name', g.name); setGpuSearchOpen(false); setGpuResults([]) }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-left mb-0.5">
                  <span className="text-xs text-white">{g.name}</span>
                  {g.relative_score != null && <span className="text-[10px] text-purple-400">score {g.relative_score}</span>}
                </button>
              ))}
              {!gpuQuery.trim() && <p className="text-[10px] text-white/20 text-center py-1">GPU 이름 입력</p>}
            </div>
          )}
          <input type="text" value={form.gpu_name ?? ''}
            onChange={(e) => pf('gpu_name', e.target.value || null)}
            placeholder="GPU 이름 직접 입력 (선택)"
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/50"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">RAM (GB, 쉼표로 옵션)</label>
          <input type="text" value={form.ram_gb ?? ''}
            onChange={(e) => pf('ram_gb', e.target.value || null)}
            placeholder="예: 32 또는 32, 64"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">Storage (GB, 쉼표로 옵션)</label>
          <input type="text" value={form.storage_gb ?? ''}
            onChange={(e) => pf('storage_gb', e.target.value || null)}
            placeholder="예: 512 또는 512, 1024"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1">가격 (USD)</label>
          <input type="number" step="1" value={form.price_usd ?? ''}
            onChange={(e) => pf('price_usd', e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </div>

      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={cancelEdit}
          className="px-3 py-1.5 text-sm text-white/40 hover:text-white border border-border rounded-lg transition-colors">
          취소
        </button>
        <button onClick={handleSave} disabled={!!saving}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent/90 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          저장
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-surface border border-border rounded-card overflow-hidden">
      <button
        type="button"
        onClick={() => {}}
        className="w-full flex items-center justify-between px-6 py-4"
        style={{ cursor: 'default' }}
      >
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-white/40" />
          <h2 className="font-semibold text-white">제품 옵션 (variants)</h2>
          {variants.length > 0 && (
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">{variants.length}개</span>
          )}
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={startAdd}
            className="flex items-center gap-1.5 text-xs bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
          >
            <Plus size={12} />
            옵션 추가
          </button>
        )}
      </button>

      <div className="px-6 pb-6">
        <p className="text-xs text-white/30 mb-3">
          같은 모델이지만 CPU·GPU·RAM·가격이 다른 구성을 옵션으로 등록합니다. 기본 모델 외에 추가 옵션으로 표시됩니다.
        </p>

        {loading ? (
          <div className="flex gap-1.5 py-4 justify-center">
            {[0,1,2].map((i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
          </div>
        ) : (
          <>
            {/* 기본 옵션 행 (랩탑 전용) */}
            {isLaptop && baseSpecs && onSaveBase && (
              <div>
                {editingBase ? VariantFormUI : (
                  <div className="flex items-start gap-3 py-2.5 border-b border-border/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">공통 스펙</p>
                        <span className="text-[10px] text-white/30 bg-white/5 border border-border rounded px-1.5 py-0.5">specs_common</span>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">
                        {[
                          baseSpecs.cpu_name && `CPU: ${baseSpecs.cpu_name}`,
                          baseSpecs.gpu_name && `GPU: ${baseSpecs.gpu_name}`,
                          baseSpecs.ram_gb && `${baseSpecs.ram_gb}GB RAM`,
                          baseSpecs.storage_gb && `${baseSpecs.storage_gb}GB Storage`,
                          baseSpecs.price_usd && `$${Number(baseSpecs.price_usd).toLocaleString()}`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button onClick={startEditBase} disabled={isEditing}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-accent hover:bg-accent/10 border border-border hover:border-accent/30 rounded-lg transition-colors disabled:opacity-30 flex-shrink-0">
                      <Pencil size={11} />
                      수정
                    </button>
                  </div>
                )}
              </div>
            )}

            {variants.length === 0 && !addingNew && !isLaptop && (
              <p className="text-xs text-white/20 py-2 text-center">옵션 없음 — 기본 모델만 노출됩니다</p>
            )}

            {variants.map((v) => (
              <div key={v.id}>
                {editingId === v.id ? VariantFormUI : (
                  <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{v.variant_name}</p>
                        {v.is_default && (
                          <span className="text-[10px] text-accent font-bold bg-accent/10 border border-accent/30 rounded px-1.5 py-0.5 flex-shrink-0">기본</span>
                        )}
                      </div>
                      <p className="text-xs text-white/30 mt-0.5 space-x-2">
                        {v.cpu_name && <span>CPU: {v.cpu_name}</span>}
                        {v.gpu_name && <span>· GPU: {v.gpu_name}</span>}
                        {v.ram_gb && <span>· {v.ram_gb}GB RAM</span>}
                        {v.storage_gb && <span>· {v.storage_gb}GB Storage</span>}
                        {v.price_usd && <span>· ${Number(v.price_usd).toLocaleString()}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!v.is_default && (
                        <button onClick={() => handleSetDefault(v.id)} disabled={!!saving}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/30 hover:text-accent hover:bg-accent/10 border border-border hover:border-accent/30 rounded-lg transition-colors disabled:opacity-30">
                          {saving === v.id ? <RefreshCw size={11} className="animate-spin" /> : '★'}
                          기본으로
                        </button>
                      )}
                      <button onClick={() => startEdit(v)} disabled={isEditing}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-accent hover:bg-accent/10 border border-border hover:border-accent/30 rounded-lg transition-colors disabled:opacity-30">
                        <Pencil size={11} />
                        수정
                      </button>
                      <button onClick={() => handleDelete(v.id, v.variant_name)} disabled={!!saving}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-border hover:border-red-500/20 rounded-lg transition-colors disabled:opacity-30">
                        {saving === v.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addingNew && VariantFormUI}

            {!isEditing && variants.length > 0 && (
              <button onClick={startAdd}
                className="mt-3 flex items-center gap-1.5 text-xs text-white/30 hover:text-accent border border-dashed border-border hover:border-accent/40 px-3 py-2 rounded-lg transition-colors w-full justify-center">
                <Plus size={12} />
                옵션 추가
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProductEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fromCategory = searchParams.get('category') ?? ''
  const backUrl = `/admin?tab=products${fromCategory ? `&category=${fromCategory}` : ''}`

  const [authed, setAuthed] = useState(false)
  const [token, setToken] = useState('')
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [commonSpecs, setCommonSpecs] = useState<Record<string, unknown>>({})
  const [categorySpecs, setCategorySpecs] = useState<Record<string, unknown>>({})
  // CPU 검색 & 연결
  const [cpuQuery, setCpuQuery]       = useState('')
  const [cpuResults, setCpuResults]   = useState<{ id: string; name: string; cores: number | null; clock_base: number | null; clock_boost: number | null; gpu_name: string | null; gpu_id: string | null; gpus: { name: string } | null; relative_score: number | null; gb6_single: number | null; gb6_multi: number | null; tdmark_score: number | null; antutu_score: number | null; cinebench_single: number | null; cinebench_multi: number | null; score_source: string | null }[]>([])
  const [cpuSearchOpen, setCpuSearchOpen] = useState(false)
  const [cpuCreating, setCpuCreating] = useState(false)
  const [linkedCpuName, setLinkedCpuName] = useState('')
  const cpuSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // GPU 검색 & 연결
  const [gpuQuery, setGpuQuery]       = useState('')
  const [gpuResults, setGpuResults]   = useState<{ id: string; name: string; brand: string | null; type: string | null; cores: number | null; gb6_single: number | null; gb6_ml_single: number | null; gb6_ml_half: number | null; gb6_ml_quantized: number | null; relative_score: number | null; score_source: string | null }[]>([])
  const [gpuSearchOpen, setGpuSearchOpen] = useState(false)
  const [gpuCreating, setGpuCreating] = useState(false)
  const [linkedGpuName, setLinkedGpuName] = useState('')
  const gpuSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [nameTranslations, setNameTranslations] = useState<Record<string, string>>({ en: '', ko: '', ja: '', es: '', pt: '', fr: '', de: '' })
  const [translating, setTranslating] = useState(false)
  const [amazonFilling, setAmazonFilling] = useState(false)
  const [specsFilling, setSpecsFilling] = useState(false)
  const [sameProducts, setSameProducts] = useState<{ id: string; name: string; brand: string; image_url: string | null; is_visible: boolean }[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = (session?.user?.email ?? '').toLowerCase()
      if (!session) { router.replace('/login'); return }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) { router.replace('/'); return }
      setToken(session.access_token)
      setAuthed(true)
    })
  }, [router])

  const isNew = id === 'new'

  // 새 제품일 때 URL 카테고리 파라미터로 초기값 설정
  useEffect(() => {
    if (isNew && fromCategory) {
      setForm((prev) => ({ ...prev, category: fromCategory }))
    }
  }, [isNew, fromCategory])

  // 같은 카테고리 제품 목록 fetch
  useEffect(() => {
    const cat = (form.category as string) || fromCategory
    if (!authed || !cat) return
    supabase
      .from('products')
      .select('id, name, brand, image_url, is_visible')
      .eq('category', cat)
      .order('brand').order('name')
      .limit(100)
      .then(({ data }) => setSameProducts(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, form.category, fromCategory])

  useEffect(() => {
    if (!authed || isNew) return
    supabase
      .from('products')
      .select(`
        id, name, brand, category, image_url, price_usd, source_url, scrape_status, name_translations, is_visible,
        specs_common(*),
        specs_laptop(*),
        specs_smartphone(*),
        specs_tablet(*),
        specs_smartwatch(*),
        specs_headphones(*),
        specs_monitor(*),
        specs_tv(*),
        specs_car(*)
      `)
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (!data) return
        setProduct(data)
        setForm({
          name: data.name,
          brand: data.brand,
          category: data.category,
          image_url: data.image_url,
          price_usd: data.price_usd,
          source_url: data.source_url,
          scrape_status: data.scrape_status,
          is_visible: data.is_visible !== false,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (data.name_translations && typeof data.name_translations === 'object') {
          setNameTranslations({ en: '', ko: '', ja: '', es: '', pt: '', fr: '', de: '', ...(data.name_translations as Record<string, string>) })
        }
        setImagePreview((data.image_url as string) ?? '')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const common = data.specs_common as any
        if (common) {
          const { id: _id, product_id: _pid, created_at: _ca, ...rest } = common
          void _id; void _pid; void _ca
          setCommonSpecs(rest ?? {})
        }
        const cat = data.category as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const catSpecs = (data as any)[`specs_${cat}`]
        if (catSpecs) {
          const { id: _id, product_id: _pid, created_at: _ca, ...rest } = catSpecs
          void _id; void _pid; void _ca
          setCategorySpecs(rest ?? {})
        }

        // CPU 벤치마크 점수 로드
        const cpuId = common?.cpu_id
        if (cpuId) {
          supabase
            .from('cpus')
            .select('name')
            .eq('id', cpuId)
            .single()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data: cpu }: { data: any }) => {
              if (cpu) setLinkedCpuName(cpu.name ?? '')
            })
        }

        // GPU 이름 로드 (gpu_id로 연결된 경우)
        const gpuId = common?.gpu_id
        if (gpuId) {
          supabase
            .from('gpus')
            .select('name')
            .eq('id', gpuId)
            .single()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data: gpu }: { data: any }) => {
              if (gpu) setLinkedGpuName(gpu.name ?? '')
            })
        } else if (common?.gpu_name) {
          setLinkedGpuName(common.gpu_name)
        }
      })
  }, [authed, id, isNew])

  // CPU 검색 (디바운스 300ms)
  const searchCpus = useCallback((q: string) => {
    if (cpuSearchRef.current) clearTimeout(cpuSearchRef.current)
    if (!q.trim()) { setCpuResults([]); return }
    cpuSearchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/cpus?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setCpuResults(json.cpus ?? [])
    }, 300)
  }, [])

  const selectCpu = (cpu: typeof cpuResults[0]) => {
    const clockLabel = cpu.clock_base != null
      ? cpu.clock_boost != null
        ? `${cpu.clock_base} GHz / ${cpu.clock_boost} GHz boost`
        : `${cpu.clock_base} GHz`
      : undefined
    // CPU에 연결된 GPU 이름: 조인된 gpus 테이블 우선, 없으면 cpu 텍스트 필드 fallback
    const resolvedGpuName = cpu.gpus?.name ?? cpu.gpu_name ?? null
    setCommonSpecs((p) => ({
      ...p,
      cpu_id:    cpu.id,
      cpu_name:  cpu.name,
      ...(resolvedGpuName        != null && { gpu_name: resolvedGpuName }),
      ...(cpu.gpu_id             != null && { gpu_id:   cpu.gpu_id }),
      ...(cpu.cores              != null && { cpu_cores: cpu.cores }),
      ...(clockLabel                      && { cpu_clock: clockLabel }),
    }))
    setLinkedCpuName(cpu.name)
    if (resolvedGpuName) setLinkedGpuName(resolvedGpuName)
    setCpuSearchOpen(false)
    setCpuQuery('')
    setCpuResults([])
  }

  const createCpu = async () => {
    if (!cpuQuery.trim()) return
    setCpuCreating(true)
    try {
      const res = await fetch('/api/admin/cpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: cpuQuery.trim() }),
      })
      const json = await res.json()
      if (json.id) selectCpu(json)
    } finally {
      setCpuCreating(false)
    }
  }

  // GPU 검색 (디바운스 300ms)
  const searchGpus = useCallback((q: string) => {
    if (gpuSearchRef.current) clearTimeout(gpuSearchRef.current)
    if (!q.trim()) { setGpuResults([]); return }
    gpuSearchRef.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/gpus?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setGpuResults(json.gpus ?? [])
    }, 300)
  }, [])

  const selectGpu = (gpu: typeof gpuResults[0]) => {
    setCommonSpecs((p) => ({
      ...p,
      gpu_id:   gpu.id,
      gpu_name: gpu.name,
    }))
    setLinkedGpuName(gpu.name)
    setGpuSearchOpen(false)
    setGpuQuery('')
    setGpuResults([])
  }

  const createGpu = async () => {
    if (!gpuQuery.trim()) return
    setGpuCreating(true)
    try {
      const res = await fetch('/api/admin/gpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: gpuQuery.trim(), type: 'laptop' }),
      })
      const json = await res.json()
      if (json.id) selectGpu(json)
    } finally {
      setGpuCreating(false)
    }
  }

  const patchForm = (field: string, value: unknown) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (field === 'image_url') setImagePreview(String(value ?? ''))
    if (field === 'category') setCategorySpecs({})
  }
  const patchCommon = (field: string, value: unknown) => setCommonSpecs((p) => ({ ...p, [field]: value }))
  const patchCat = (field: string, value: unknown) => setCategorySpecs((p) => ({ ...p, [field]: value }))

  const handleSaveBase = async (base: VariantForm): Promise<{ ok: boolean; error?: string }> => {
    const updatedCommon = {
      ...commonSpecs,
      cpu_name: base.cpu_name ?? undefined,
      cpu_id: base.cpu_id ?? undefined,
      gpu_name: base.gpu_name ?? undefined,
      gpu_id: base.gpu_id ?? undefined,
      ram_gb: base.ram_gb ?? undefined,
      storage_gb: base.storage_gb ?? undefined,
      amazon_url: base.amazon_url ?? undefined,
    }
    const body: Record<string, unknown> = {
      ...form,
      price_usd: base.price_usd,
      specs_common: updatedCommon,
      [`specs_${category}`]: categorySpecs,
      cpu_id: base.cpu_id,
    }
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setCommonSpecs(updatedCommon)
        if (base.price_usd !== null) patchForm('price_usd', base.price_usd)
        if (base.cpu_name) setLinkedCpuName(base.cpu_name)
        if (base.gpu_name) setLinkedGpuName(base.gpu_name)
        return { ok: true }
      }
      return { ok: false, error: json.error ?? '오류' }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  const handleTranslate = async () => {
    const name = (form.name as string)?.trim()
    if (!name) return
    setTranslating(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (res.ok && json.translations) {
        setNameTranslations(json.translations)
      } else {
        setMessage({ type: 'err', text: json.error ?? '번역 실패' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setTranslating(false)
    }
  }

  const handleAmazonFill = async () => {
    const name = (form.name as string)?.trim()
    if (!name) return
    setAmazonFilling(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, kind: 'amazon' }),
      })
      const json = await res.json()
      if (!res.ok) { setMessage({ type: 'err', text: json.error ?? 'Amazon 링크 생성 실패' }); return }
      if (json.amazon_url) {
        patchCommon('amazon_url', json.amazon_url)
        setMessage({ type: 'ok', text: `Amazon 링크 생성 완료` })
      } else {
        setMessage({ type: 'err', text: 'Amazon에서 해당 제품을 찾을 수 없습니다' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setAmazonFilling(false)
    }
  }

  const handleSpecsFill = async () => {
    const name = (form.name as string)?.trim()
    const cat = (form.category as string)?.trim()
    if (!name || !cat) return
    setSpecsFilling(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, kind: 'product_specs', category: cat }),
      })
      const json = await res.json()
      if (!res.ok) { setMessage({ type: 'err', text: json.error ?? '스펙 채우기 실패' }); return }
      if (json.specs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCategorySpecs((prev: any) => ({ ...prev, ...json.specs }))
        setMessage({ type: 'ok', text: '스펙 자동 채우기 완료 — 저장 버튼으로 반영하세요' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setSpecsFilling(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      if (isNew) {
        // Create new product
        const name = (form.name as string ?? '').trim()
        const brand = (form.brand as string ?? '').trim()
        const category = (form.category as string ?? '').trim()
        if (!name || !brand || !category) {
          setMessage({ type: 'err', text: '이름, 브랜드, 카테고리를 입력하세요' })
          return
        }
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, brand, category }),
        })
        const json = await res.json()
        if (!res.ok) {
          setMessage({ type: 'err', text: json.error ?? '생성 오류' })
          return
        }
        const newId = json.id
        // 나머지 스펙/정보도 함께 저장
        const patchBody: Record<string, unknown> = {
          ...form,
          name_translations: nameTranslations,
          specs_common: commonSpecs,
          [`specs_${category}`]: categorySpecs,
          cpu_id: commonSpecs.cpu_id,
            }
        const patchRes = await fetch(`/api/admin/products/${newId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(patchBody),
        })
        const patchJson = await patchRes.json()
        if (!patchRes.ok) {
          setMessage({ type: 'err', text: patchJson.error ?? '스펙 저장 오류' })
          return
        }
        setMessage({ type: 'ok', text: '저장됨' })
        await new Promise((r) => setTimeout(r, 800))
        router.replace(`/admin/products/${newId}${fromCategory ? `?category=${fromCategory}` : ''}`)
        return
      }

      const category = (form.category as string) ?? ''
      const body: Record<string, unknown> = {
        ...form,
        name_translations: nameTranslations,
        specs_common: commonSpecs,
        [`specs_${category}`]: categorySpecs,
        cpu_id: commonSpecs.cpu_id,
        }
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        setMessage({ type: 'ok', text: '저장됨' })
      } else {
        setMessage({ type: 'err', text: json.error ?? '오류' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!confirm('이 제품을 복사하시겠어요? 복사본은 비공개로 생성됩니다.')) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (res.ok && json.id) {
        router.push(`/admin/products/${json.id}`)
      } else {
        setMessage({ type: 'err', text: json.error ?? '복사 오류' })
      }
    } catch (e) {
      setMessage({ type: 'err', text: String(e) })
    } finally {
      setDuplicating(false)
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
        patchForm('image_url', json.image_url)
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

  const category = (form.category as string) ?? ''
  const g = (obj: Record<string, unknown>, k: string) => (obj[k] ?? '') as string
  const gn = (obj: Record<string, unknown>, k: string) => (obj[k] ?? null) as number | null
  const gb = (obj: Record<string, unknown>, k: string) => Boolean(obj[k])

  if (!authed || (!isNew && !product)) {
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
      <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Link href={backUrl} className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} />
            제품 관리
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 truncate max-w-xs">{isNew ? '새 제품 추가' : (product?.name as string)}</span>
        </div>
        <div className="flex items-center gap-3">
          {(form.source_url as string) && (
            <a href={form.source_url as string} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ExternalLink size={13} />소스
            </a>
          )}
          {!isNew && (
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center gap-2 bg-surface border border-border hover:border-white/20 text-white/60 hover:text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {duplicating ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
              복사
            </button>
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

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        {/* ── 이미지 ── */}
        <SectionCard title="이미지">
          <div className="flex gap-6">
            <div className="flex-shrink-0 w-32 h-32 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '' }} />
              ) : (
                <span className="text-white/20 text-xs">미리보기</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <Field label="이미지 URL">
                <TextInput value={g(form, 'image_url')} onChange={(v) => patchForm('image_url', v)} placeholder="https://..." />
              </Field>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">또는 파일 업로드</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-border rounded-lg text-sm text-white/60 hover:text-white disabled:opacity-40 transition-colors">
                  {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  {uploading ? '업로드 중...' : '이미지 선택'}
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 기본 정보 ── */}
        <SectionCard title="기본 정보">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="제품명">
                <TextInput value={g(form, 'name')} onChange={(v) => patchForm('name', v)} />
              </Field>
            </div>
            {/* 다국어 제품명 */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/40">다국어 제품명 (SEO)</label>
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating || !g(form, 'name')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-semibold hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {translating ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                  {translating ? 'AI 번역 중...' : 'AI 자동 번역'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['en', 'ko', 'ja', 'es', 'pt', 'fr', 'de'] as const).map((lang) => (
                  <div key={lang}>
                    <label className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">{lang}</label>
                    <input
                      type="text"
                      value={nameTranslations[lang] ?? ''}
                      onChange={(e) => setNameTranslations((p) => ({ ...p, [lang]: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                ))}
              </div>
            </div>
            <Field label="브랜드">
              <input
                type="text"
                list="brand-list"
                value={g(form, 'brand')}
                onChange={(e) => patchForm('brand', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
              />
              <datalist id="brand-list">
                {BRANDS.map((b) => <option key={b} value={b} />)}
              </datalist>
            </Field>
            <Field label="카테고리">
              <SelectInput value={g(form, 'category')} onChange={(v) => patchForm('category', v)} options={CATEGORIES} />
            </Field>
            <Field label="가격 (USD)">
              <NumberInput value={gn(form, 'price_usd')} onChange={(v) => patchForm('price_usd', v)} />
            </Field>
            <Field label="스크랩 상태">
              <SelectInput value={g(form, 'scrape_status')} onChange={(v) => patchForm('scrape_status', v)} options={SCRAPE_STATUSES} />
            </Field>
            <Field label="노출 여부">
              <Toggle
                value={form.is_visible !== false}
                onChange={(v) => patchForm('is_visible', v)}
                label={form.is_visible !== false ? '공개' : '비공개'}
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── 공통 스펙 ── */}
        <SectionCard title="공통 스펙 (specs_common)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {category === 'laptop' && (
              <div className="md:col-span-2 text-xs text-white/40 bg-white/5 border border-border rounded-lg px-3 py-2">
                노트북의 CPU · GPU · RAM · 스토리지는 아래 <span className="text-accent font-semibold">제품 옵션</span> 섹션의 기본 옵션에서 관리합니다.
              </div>
            )}

            {/* CPU 검색 & 연결 */}
            {ELECTRONICS_CATS.includes(category) && <div className="md:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">CPU 연결 (벤치마크 점수용)</label>

              {/* 현재 연결된 CPU */}
              <div className="flex items-center gap-2 mb-2">
                {commonSpecs.cpu_id ? (
                  <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2 flex-1">
                    <Link2 size={13} className="text-accent flex-shrink-0" />
                    <span className="text-sm text-white font-semibold truncate">{linkedCpuName || (commonSpecs.cpu_id as string)}</span>
                    <button onClick={() => { setCommonSpecs((p) => ({ ...p, cpu_id: undefined })); setLinkedCpuName('') }}
                      className="ml-1 text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/5 border border-border rounded-lg px-3 py-2 flex-1">
                    <Link2 size={13} className="text-white/20 flex-shrink-0" />
                    <span className="text-sm text-white/30">연결된 CPU 없음</span>
                  </div>
                )}
                <button
                  onClick={() => { setCpuSearchOpen(!cpuSearchOpen); setCpuQuery(''); setCpuResults([]) }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-border rounded-lg text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                >
                  <Search size={13} />
                  {cpuSearchOpen ? '닫기' : 'CPU 검색'}
                </button>
              </div>

              {/* 검색 패널 */}
              {cpuSearchOpen && (
                <div className="bg-background border border-border rounded-xl p-3">
                  <input
                    type="text"
                    value={cpuQuery}
                    placeholder="CPU 이름 검색 (예: Snapdragon 8 Gen 3, Apple M4...)"
                    onChange={(e) => { setCpuQuery(e.target.value); searchCpus(e.target.value) }}
                    autoFocus
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent mb-2"
                  />

                  {/* 검색 결과 */}
                  {cpuResults.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {cpuResults.map((cpu) => (
                        <button
                          key={cpu.id}
                          onClick={() => selectCpu(cpu)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-accent/30 transition-all text-left"
                        >
                          <div>
                            <p className="text-sm text-white font-semibold">{cpu.name}</p>
                            <p className="text-xs text-white/30 mt-0.5">
                              {[
                                cpu.gb6_single != null && `GB6S: ${cpu.gb6_single}`,
                                cpu.gb6_multi  != null && `GB6M: ${cpu.gb6_multi}`,
                                cpu.tdmark_score  != null && `3DM: ${cpu.tdmark_score}`,
                                cpu.antutu_score  != null && `AnTuTu: ${cpu.antutu_score.toLocaleString()}`,
                                cpu.cinebench_single != null && `CBs: ${cpu.cinebench_single}`,
                                cpu.cinebench_multi  != null && `CBm: ${cpu.cinebench_multi}`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {cpu.relative_score != null && (
                            <span className="text-xs font-bold text-accent ml-3 flex-shrink-0">score {cpu.relative_score}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 결과 없을 때 새 CPU 생성 */}
                  {cpuQuery.trim() && cpuResults.length === 0 && (
                    <button
                      onClick={createCpu}
                      disabled={cpuCreating}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-accent/40 text-accent hover:bg-accent/10 transition-colors text-sm disabled:opacity-50"
                    >
                      {cpuCreating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                      &quot;{cpuQuery.trim()}&quot; 으로 새 CPU 생성
                    </button>
                  )}

                  {!cpuQuery.trim() && (
                    <p className="text-xs text-white/20 text-center py-1">CPU 이름을 입력하면 검색됩니다</p>
                  )}
                </div>
              )}
            </div>}

            {/* GPU 검색 & 연결 */}
            {ELECTRONICS_CATS.includes(category) && <div className="md:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">GPU 연결 (DB 직접 연결)</label>

              {/* 현재 연결된 GPU */}
              <div className="flex items-center gap-2 mb-2">
                {commonSpecs.gpu_id ? (
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2 flex-1">
                    <Link2 size={13} className="text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-white font-semibold truncate">{linkedGpuName || (commonSpecs.gpu_id as string)}</span>
                    <button onClick={() => { setCommonSpecs((p) => ({ ...p, gpu_id: undefined })); setLinkedGpuName('') }}
                      className="ml-auto text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/5 border border-border rounded-lg px-3 py-2 flex-1">
                    <Link2 size={13} className="text-white/20 flex-shrink-0" />
                    <span className="text-sm text-white/30">
                      {linkedGpuName ? `"${linkedGpuName}" (CPU 자동 설정 · DB 미연결)` : '연결된 GPU 없음'}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => { setGpuSearchOpen(!gpuSearchOpen); setGpuQuery(''); setGpuResults([]) }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-border rounded-lg text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
                >
                  <Search size={13} />
                  {gpuSearchOpen ? '닫기' : 'GPU 검색'}
                </button>
              </div>

              {/* GPU 검색 패널 */}
              {gpuSearchOpen && (
                <div className="bg-background border border-border rounded-xl p-3">
                  <input
                    type="text"
                    value={gpuQuery}
                    placeholder="GPU 이름 검색 (예: RTX 4060, NVIDIA GeForce...)"
                    onChange={(e) => { setGpuQuery(e.target.value); searchGpus(e.target.value) }}
                    autoFocus
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent mb-2"
                  />

                  {/* 검색 결과 */}
                  {gpuResults.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {gpuResults.map((gpu) => (
                        <button
                          key={gpu.id}
                          onClick={() => selectGpu(gpu)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-purple-500/30 transition-all text-left"
                        >
                          <div>
                            <p className="text-sm text-white font-semibold">{gpu.name}</p>
                            <p className="text-xs text-white/30 mt-0.5">
                              {[
                                gpu.brand && gpu.brand,
                                gpu.type  && `(${gpu.type})`,
                                gpu.gb6_single    != null && `GB6S: ${gpu.gb6_single}`,
                                gpu.gb6_ml_single != null && `ML: ${gpu.gb6_ml_single}`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {gpu.relative_score != null && (
                            <span className="text-xs font-bold text-purple-400 ml-3 flex-shrink-0">score {gpu.relative_score}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 결과 없을 때 새 GPU 생성 */}
                  {gpuQuery.trim() && gpuResults.length === 0 && (
                    <button
                      onClick={createGpu}
                      disabled={gpuCreating}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors text-sm disabled:opacity-50"
                    >
                      {gpuCreating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                      &quot;{gpuQuery.trim()}&quot; 으로 새 GPU 생성
                    </button>
                  )}

                  {!gpuQuery.trim() && (
                    <p className="text-xs text-white/20 text-center py-1">GPU 이름을 입력하면 검색됩니다</p>
                  )}
                </div>
              )}
            </div>}

            {/* CPU / GPU 이름 (electronics only) */}
            {ELECTRONICS_CATS.includes(category) && <>
              <Field label="CPU 이름">
                <TextInput value={g(commonSpecs, 'cpu_name')} onChange={(v) => patchCommon('cpu_name', v)} placeholder="Apple M4 Pro" />
              </Field>
              <Field label="GPU 이름">
                <TextInput value={g(commonSpecs, 'gpu_name')} onChange={(v) => patchCommon('gpu_name', v)} placeholder="Apple M4 Pro GPU" />
              </Field>
            </>}

            {/* RAM / Storage (electronics + headphones 제외 non-laptop) */}
            {ELECTRONICS_CATS.includes(category) && <>
              <Field label="RAM 용량 (쉼표로 여러 옵션 가능)">
                <TextInput value={g(commonSpecs, 'ram_gb')} onChange={(v) => patchCommon('ram_gb', v)} placeholder="8, 16, 32" />
              </Field>
              <Field label="스토리지 용량 (쉼표로 여러 옵션 가능)">
                <TextInput value={g(commonSpecs, 'storage_gb')} onChange={(v) => patchCommon('storage_gb', v)} placeholder="256, 512, 1024" />
              </Field>
            </>}

            {/* OS (electronics only) */}
            {ELECTRONICS_CATS.includes(category) && (
              <Field label="OS">
                <TextInput value={g(commonSpecs, 'os')} onChange={(v) => patchCommon('os', v)} placeholder="iOS 18, Android 15..." />
              </Field>
            )}

            {/* Wi-Fi (electronics only) */}
            {ELECTRONICS_CATS.includes(category) && (
              <Field label="Wi-Fi 규격">
                <TextInput value={g(commonSpecs, 'wifi_standard')} onChange={(v) => patchCommon('wifi_standard', v)} placeholder="Wi-Fi 6E" />
              </Field>
            )}

            {/* Bluetooth (electronics + headphones) */}
            {(ELECTRONICS_CATS.includes(category) || category === 'headphones') && (
              <Field label="블루투스">
                <TextInput value={g(commonSpecs, 'bluetooth_version')} onChange={(v) => patchCommon('bluetooth_version', v)} placeholder="5.3" />
              </Field>
            )}

            {/* 출시연도 · 가격 · 색상 — 모든 카테고리 공통 */}
            <Field label="출시연도">
              <NumberInput value={gn(commonSpecs, 'launch_year')} onChange={(v) => patchCommon('launch_year', v)} />
            </Field>
            <Field label="출시가격 (USD)">
              <NumberInput value={gn(commonSpecs, 'launch_price_usd')} onChange={(v) => patchCommon('launch_price_usd', v)} />
            </Field>
            {category !== 'car' && (
              <div className="md:col-span-2">
                <Field label="색상 옵션 (쉼표 구분)">
                  <TextInput value={g(commonSpecs, 'colors')} onChange={(v) => patchCommon('colors', v)} placeholder="Space Black, Silver, Starlight" />
                </Field>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── 제품 옵션 (variants) ── */}
        {isNew ? (
          <div className="bg-surface border border-border rounded-card px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={15} className="text-white/40" />
              <h2 className="font-semibold text-white">제품 옵션 (variants)</h2>
            </div>
            <p className="text-xs text-white/30">제품을 먼저 저장하면 CPU·GPU·가격별 옵션을 추가할 수 있습니다.</p>
          </div>
        ) : (
          <VariantsSection
            productId={id}
            token={token}
            isLaptop={category === 'laptop'}
            baseSpecs={category === 'laptop' ? {
              cpu_name: (commonSpecs.cpu_name as string | null) ?? null,
              cpu_id:   (commonSpecs.cpu_id   as string | null) ?? null,
              gpu_name: (commonSpecs.gpu_name as string | null) ?? null,
              gpu_id:   (commonSpecs.gpu_id   as string | null) ?? null,
              ram_gb:      (commonSpecs.ram_gb      as string | null) ?? null,
              storage_gb:  (commonSpecs.storage_gb  as string | null) ?? null,
              price_usd:   (form.price_usd           as number | null) ?? null,
              amazon_url:  (commonSpecs.amazon_url   as string | null) ?? null,
            } : undefined}
            onSaveBase={category === 'laptop' ? handleSaveBase : undefined}
          />
        )}

        {/* ── 카테고리 스펙 ── */}
        {category === 'laptop' && (
          <SectionCard title="노트북 스펙 (specs_laptop)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="디스플레이 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} />
              </Field>
              <Field label="해상도">
                <TextInput value={g(categorySpecs, 'display_resolution')} onChange={(v) => patchCat('display_resolution', v)} placeholder="2560x1664" />
              </Field>
              <Field label="주사율 (Hz)">
                <NumberInput value={gn(categorySpecs, 'display_hz')} onChange={(v) => patchCat('display_hz', v)} />
              </Field>
              <Field label="패널 타입 (쉼표로 여러 개 가능)">
                <TextInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} placeholder="IPS, Mini-LED" />
              </Field>
              <Field label="밝기 (nits)">
                <NumberInput value={gn(categorySpecs, 'display_nits')} onChange={(v) => patchCat('display_nits', v)} />
              </Field>
              <Field label="색영역">
                <TextInput value={g(categorySpecs, 'display_color_gamut')} onChange={(v) => patchCat('display_color_gamut', v)} placeholder="P3, sRGB..." />
              </Field>
              <Field label="무게 (kg)">
                <NumberInput value={gn(categorySpecs, 'weight_kg')} onChange={(v) => patchCat('weight_kg', v)} />
              </Field>
              <Field label="배터리 용량 (Wh)">
                <NumberInput value={gn(categorySpecs, 'battery_wh')} onChange={(v) => patchCat('battery_wh', v)} />
              </Field>
            </div>
          </SectionCard>
        )}

        {category === 'smartphone' && (
          <SectionCard title="스마트폰 스펙 (specs_smartphone)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="디스플레이 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} />
              </Field>
              <Field label="해상도">
                <TextInput value={g(categorySpecs, 'display_resolution')} onChange={(v) => patchCat('display_resolution', v)} placeholder="2556x1179" />
              </Field>
              <Field label="주사율 (Hz)">
                <NumberInput value={gn(categorySpecs, 'display_hz')} onChange={(v) => patchCat('display_hz', v)} />
              </Field>
              <Field label="패널 타입 (쉼표로 여러 개 가능)">
                <TextInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} placeholder="OLED, AMOLED" />
              </Field>
              <Field label="밝기 (nits)">
                <NumberInput value={gn(categorySpecs, 'display_nits')} onChange={(v) => patchCat('display_nits', v)} />
              </Field>
              <Field label="무게 (g)">
                <NumberInput value={gn(categorySpecs, 'weight_g')} onChange={(v) => patchCat('weight_g', v)} />
              </Field>
              <Field label="두께 (mm)">
                <NumberInput value={gn(categorySpecs, 'thickness_mm')} onChange={(v) => patchCat('thickness_mm', v)} />
              </Field>
              <Field label="배터리 (mAh)">
                <NumberInput value={gn(categorySpecs, 'battery_mah')} onChange={(v) => patchCat('battery_mah', v)} />
              </Field>
              <Field label="메인 카메라 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_main_mp')} onChange={(v) => patchCat('camera_main_mp', v)} />
              </Field>
              <Field label="초광각 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_ultra_mp')} onChange={(v) => patchCat('camera_ultra_mp', v)} />
              </Field>
              <Field label="망원 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_tele_mp')} onChange={(v) => patchCat('camera_tele_mp', v)} />
              </Field>
              <Field label="광학 줌 (배)">
                <NumberInput value={gn(categorySpecs, 'camera_optical_zoom')} onChange={(v) => patchCat('camera_optical_zoom', v)} />
              </Field>
              <Field label="전면 카메라 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_front_mp')} onChange={(v) => patchCat('camera_front_mp', v)} />
              </Field>
              <Field label="최대 동영상">
                <TextInput value={g(categorySpecs, 'camera_video_max')} onChange={(v) => patchCat('camera_video_max', v)} placeholder="4K 60fps" />
              </Field>
              <Field label="유선 충전 (W)">
                <NumberInput value={gn(categorySpecs, 'charging_watt')} onChange={(v) => patchCat('charging_watt', v)} />
              </Field>
              <Field label="무선 충전 (W)">
                <NumberInput value={gn(categorySpecs, 'wireless_charging_watt')} onChange={(v) => patchCat('wireless_charging_watt', v)} step="any" />
              </Field>
              <Field label="IP 등급">
                <TextInput value={g(categorySpecs, 'ip_rating')} onChange={(v) => patchCat('ip_rating', v)} placeholder="IP68" />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'has_5g')} onChange={(v) => patchCat('has_5g', v)} label="5G" />
                  <Toggle value={gb(categorySpecs, 'has_nfc')} onChange={(v) => patchCat('has_nfc', v)} label="NFC" />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {category === 'tablet' && (
          <SectionCard title="태블릿 스펙 (specs_tablet)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="디스플레이 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} />
              </Field>
              <Field label="해상도">
                <TextInput value={g(categorySpecs, 'display_resolution')} onChange={(v) => patchCat('display_resolution', v)} placeholder="2732x2048" />
              </Field>
              <Field label="주사율 (Hz)">
                <NumberInput value={gn(categorySpecs, 'display_hz')} onChange={(v) => patchCat('display_hz', v)} />
              </Field>
              <Field label="패널 타입 (쉼표로 여러 개 가능)">
                <TextInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} placeholder="OLED, AMOLED" />
              </Field>
              <Field label="밝기 (nits)">
                <NumberInput value={gn(categorySpecs, 'display_nits')} onChange={(v) => patchCat('display_nits', v)} />
              </Field>
              <Field label="무게 (g)">
                <NumberInput value={gn(categorySpecs, 'weight_g')} onChange={(v) => patchCat('weight_g', v)} />
              </Field>
              <Field label="배터리 (mAh)">
                <NumberInput value={gn(categorySpecs, 'battery_mah')} onChange={(v) => patchCat('battery_mah', v)} />
              </Field>
              <Field label="메인 카메라 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_main_mp')} onChange={(v) => patchCat('camera_main_mp', v)} />
              </Field>
              <Field label="전면 카메라 (MP)">
                <NumberInput value={gn(categorySpecs, 'camera_front_mp')} onChange={(v) => patchCat('camera_front_mp', v)} />
              </Field>
              <Field label="유선 충전 (W)">
                <NumberInput value={gn(categorySpecs, 'charging_watt')} onChange={(v) => patchCat('charging_watt', v)} />
              </Field>
              <Field label="IP 등급">
                <TextInput value={g(categorySpecs, 'ip_rating')} onChange={(v) => patchCat('ip_rating', v)} placeholder="IP68" />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'stylus_support')} onChange={(v) => patchCat('stylus_support', v)} label="스타일러스 지원" />
                  <Toggle value={gb(categorySpecs, 'cellular')} onChange={(v) => patchCat('cellular', v)} label="셀룰러" />
                  <Toggle value={gb(categorySpecs, 'keyboard_support')} onChange={(v) => patchCat('keyboard_support', v)} label="키보드 지원" />
                  <Toggle value={gb(categorySpecs, 'display_touch')} onChange={(v) => patchCat('display_touch', v)} label="터치" />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {category === 'smartwatch' && (
          <SectionCard title="스마트워치 스펙 (specs_smartwatch)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="디스플레이 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} />
              </Field>
              <Field label="패널 타입 (쉼표로 여러 개 가능)">
                <TextInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} placeholder="OLED, AMOLED" />
              </Field>
              <Field label="칩 이름">
                <TextInput value={g(categorySpecs, 'chip_name')} onChange={(v) => patchCat('chip_name', v)} placeholder="S10, Exynos W1000..." />
              </Field>
              <Field label="무게 (g)">
                <NumberInput value={gn(categorySpecs, 'weight_g')} onChange={(v) => patchCat('weight_g', v)} />
              </Field>
              <Field label="방수 등급">
                <TextInput value={g(categorySpecs, 'water_resistance')} onChange={(v) => patchCat('water_resistance', v)} placeholder="IP68, 100m, WR50..." />
              </Field>
              <Field label="호환 OS">
                <SelectInput value={g(categorySpecs, 'compatible_os')} onChange={(v) => patchCat('compatible_os', v)} options={['ios', 'android', 'both']} />
              </Field>
              <div className="md:col-span-2">
                <Field label="헬스 센서 (쉼표 구분)">
                  <TextInput value={g(categorySpecs, 'health_sensors')} onChange={(v) => patchCat('health_sensors', v)} placeholder="heart_rate,spo2,ecg,temperature" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'has_gps')} onChange={(v) => patchCat('has_gps', v)} label="GPS" />
                  <Toggle value={gb(categorySpecs, 'cellular')} onChange={(v) => patchCat('cellular', v)} label="셀룰러" />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {category === 'headphones' && (
          <SectionCard title="헤드폰 스펙 (specs_headphones)">
            <div className="flex justify-end mb-4">
              <button onClick={handleSpecsFill} disabled={specsFilling || !g(form, 'name')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-semibold hover:bg-accent/20 transition-colors disabled:opacity-40">
                {specsFilling ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                {specsFilling ? 'AI 채우는 중...' : 'AI 스펙 자동채우기'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="폼팩터">
                <SelectInput value={g(categorySpecs, 'form_factor')} onChange={(v) => patchCat('form_factor', v)} options={['over-ear', 'on-ear', 'in-ear', 'tws']} />
              </Field>
              <Field label="드라이버 크기 (mm)">
                <NumberInput value={gn(categorySpecs, 'driver_size_mm')} onChange={(v) => patchCat('driver_size_mm', v)} step="any" />
              </Field>
              <Field label="주파수 응답">
                <TextInput value={g(categorySpecs, 'frequency_response')} onChange={(v) => patchCat('frequency_response', v)} placeholder="20Hz-20kHz" />
              </Field>
              <Field label="임피던스 (Ω)">
                <NumberInput value={gn(categorySpecs, 'impedance_ohm')} onChange={(v) => patchCat('impedance_ohm', v)} step="any" />
              </Field>
              <Field label="감도 (dB)">
                <NumberInput value={gn(categorySpecs, 'sensitivity_db')} onChange={(v) => patchCat('sensitivity_db', v)} step="any" />
              </Field>
              <Field label="배터리 사용시간 (h)">
                <NumberInput value={gn(categorySpecs, 'battery_hours')} onChange={(v) => patchCat('battery_hours', v)} step="any" />
              </Field>
              <Field label="무게 (g)">
                <NumberInput value={gn(categorySpecs, 'weight_g')} onChange={(v) => patchCat('weight_g', v)} step="any" />
              </Field>
              <Field label="블루투스 버전">
                <TextInput value={g(categorySpecs, 'bluetooth_version')} onChange={(v) => patchCat('bluetooth_version', v)} placeholder="5.3" />
              </Field>
              <Field label="코덱">
                <TextInput value={g(categorySpecs, 'codec')} onChange={(v) => patchCat('codec', v)} placeholder="AAC, LDAC, aptX" />
              </Field>
              <Field label="IP 등급">
                <TextInput value={g(categorySpecs, 'ip_rating')} onChange={(v) => patchCat('ip_rating', v)} placeholder="IPX4" />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'noise_canceling')} onChange={(v) => patchCat('noise_canceling', v)} label="노이즈 캔슬링" />
                  <Toggle value={gb(categorySpecs, 'wireless')} onChange={(v) => patchCat('wireless', v)} label="무선" />
                  <Toggle value={gb(categorySpecs, 'has_microphone')} onChange={(v) => patchCat('has_microphone', v)} label="마이크" />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {category === 'monitor' && (
          <SectionCard title="모니터 스펙 (specs_monitor)">
            <div className="flex justify-end mb-4">
              <button onClick={handleSpecsFill} disabled={specsFilling || !g(form, 'name')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-semibold hover:bg-accent/20 transition-colors disabled:opacity-40">
                {specsFilling ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                {specsFilling ? 'AI 채우는 중...' : 'AI 스펙 자동채우기'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="화면 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} step="any" />
              </Field>
              <Field label="해상도">
                <TextInput value={g(categorySpecs, 'display_resolution')} onChange={(v) => patchCat('display_resolution', v)} placeholder="2560x1440" />
              </Field>
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'panel_type')} onChange={(v) => patchCat('panel_type', v)} options={['IPS', 'VA', 'TN', 'OLED', 'QD-OLED', 'Mini-LED', 'WOLED']} />
              </Field>
              <Field label="주사율 (Hz)">
                <NumberInput value={gn(categorySpecs, 'display_hz')} onChange={(v) => patchCat('display_hz', v)} />
              </Field>
              <Field label="응답속도 (ms)">
                <NumberInput value={gn(categorySpecs, 'response_time_ms')} onChange={(v) => patchCat('response_time_ms', v)} step="any" />
              </Field>
              <Field label="밝기 (nits)">
                <NumberInput value={gn(categorySpecs, 'brightness_nits')} onChange={(v) => patchCat('brightness_nits', v)} />
              </Field>
              <Field label="HDR">
                <TextInput value={g(categorySpecs, 'hdr')} onChange={(v) => patchCat('hdr', v)} placeholder="HDR400, HDR1000, Dolby Vision" />
              </Field>
              <Field label="화면비">
                <TextInput value={g(categorySpecs, 'aspect_ratio')} onChange={(v) => patchCat('aspect_ratio', v)} placeholder="16:9, 21:9, 32:9" />
              </Field>
              <Field label="가변싱크">
                <TextInput value={g(categorySpecs, 'adaptive_sync')} onChange={(v) => patchCat('adaptive_sync', v)} placeholder="G-Sync, FreeSync Premium" />
              </Field>
              <Field label="색영역">
                <TextInput value={g(categorySpecs, 'display_color_gamut')} onChange={(v) => patchCat('display_color_gamut', v)} placeholder="sRGB 99%, DCI-P3 98%" />
              </Field>
              <Field label="무게 (kg)">
                <NumberInput value={gn(categorySpecs, 'weight_kg')} onChange={(v) => patchCat('weight_kg', v)} step="any" />
              </Field>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'curved')} onChange={(v) => patchCat('curved', v)} label="커브드" />
                  <Toggle value={gb(categorySpecs, 'vesa_mount')} onChange={(v) => patchCat('vesa_mount', v)} label="VESA 마운트" />
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {category === 'tv' && (
          <SectionCard title="TV 스펙 (specs_tv)">
            <div className="flex justify-end mb-4">
              <button onClick={handleSpecsFill} disabled={specsFilling || !g(form, 'name')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-semibold hover:bg-accent/20 transition-colors disabled:opacity-40">
                {specsFilling ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                {specsFilling ? 'AI 채우는 중...' : 'AI 스펙 자동채우기'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="화면 크기 (인치)">
                <NumberInput value={gn(categorySpecs, 'display_inch')} onChange={(v) => patchCat('display_inch', v)} step="any" />
              </Field>
              <Field label="해상도">
                <SelectInput value={g(categorySpecs, 'display_resolution')} onChange={(v) => patchCat('display_resolution', v)} options={['3840x2160', '7680x4320', '1920x1080', '1280x720']} />
              </Field>
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'panel_type')} onChange={(v) => patchCat('panel_type', v)} options={['OLED', 'QLED', 'WOLED', 'QD-OLED', 'Mini-LED', 'LED', 'MICRO-LED']} />
              </Field>
              <Field label="주사율 (Hz)">
                <NumberInput value={gn(categorySpecs, 'display_hz')} onChange={(v) => patchCat('display_hz', v)} />
              </Field>
              <Field label="HDR">
                <TextInput value={g(categorySpecs, 'hdr')} onChange={(v) => patchCat('hdr', v)} placeholder="HDR10+, Dolby Vision, HLG" />
              </Field>
              <Field label="밝기 (nits)">
                <NumberInput value={gn(categorySpecs, 'brightness_nits')} onChange={(v) => patchCat('brightness_nits', v)} />
              </Field>
              <Field label="스마트 플랫폼">
                <SelectInput value={g(categorySpecs, 'smart_platform')} onChange={(v) => patchCat('smart_platform', v)} options={['webOS', 'Tizen', 'Google TV', 'Android TV', 'Roku', 'Fire TV']} />
              </Field>
              <Field label="음향 출력 (W)">
                <NumberInput value={gn(categorySpecs, 'audio_watts')} onChange={(v) => patchCat('audio_watts', v)} />
              </Field>
              <Field label="HDMI 포트 수">
                <NumberInput value={gn(categorySpecs, 'hdmi_ports')} onChange={(v) => patchCat('hdmi_ports', v)} />
              </Field>
              <Field label="USB 포트 수">
                <NumberInput value={gn(categorySpecs, 'usb_ports')} onChange={(v) => patchCat('usb_ports', v)} />
              </Field>
              <Field label="무게 (kg)">
                <NumberInput value={gn(categorySpecs, 'weight_kg')} onChange={(v) => patchCat('weight_kg', v)} step="any" />
              </Field>
              <Field label="두께 (mm)">
                <NumberInput value={gn(categorySpecs, 'thickness_mm')} onChange={(v) => patchCat('thickness_mm', v)} step="any" />
              </Field>
              <Field label="색영역">
                <TextInput value={g(categorySpecs, 'display_color_gamut')} onChange={(v) => patchCat('display_color_gamut', v)} placeholder="DCI-P3 99%" />
              </Field>
            </div>
          </SectionCard>
        )}

        {category === 'car' && (
          <SectionCard title="자동차 스펙 (specs_car)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="세대 / 코드명">
                <TextInput value={g(categorySpecs, 'generation')} onChange={(v) => patchCat('generation', v)} placeholder="E210, F30, 12th Gen, Highland..." />
              </Field>
              <Field label="생산 종료 연도">
                <NumberInput value={gn(categorySpecs, 'production_end')} onChange={(v) => patchCat('production_end', v)} />
              </Field>
            </div>
            <div className="flex justify-end mb-4">
              <button onClick={handleSpecsFill} disabled={specsFilling || !g(form, 'name')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs text-accent font-semibold hover:bg-accent/20 transition-colors disabled:opacity-40">
                {specsFilling ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
                {specsFilling ? 'AI 채우는 중...' : 'AI 스펙 자동채우기'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="차체 형태">
                <SelectInput value={g(categorySpecs, 'body_type')} onChange={(v) => patchCat('body_type', v)} options={['sedan', 'suv', 'hatchback', 'coupe', 'wagon', 'pickup', 'van', 'convertible']} />
              </Field>
              <Field label="구동 방식">
                <SelectInput value={g(categorySpecs, 'drivetrain')} onChange={(v) => patchCat('drivetrain', v)} options={['FWD', 'RWD', 'AWD', '4WD']} />
              </Field>
              <Field label="파워트레인">
                <SelectInput value={g(categorySpecs, 'powertrain')} onChange={(v) => patchCat('powertrain', v)} options={['BEV', 'PHEV', 'HEV', 'MHEV', 'ICE']} />
              </Field>
              <Field label="배기량 (cc)">
                <NumberInput value={gn(categorySpecs, 'engine_cc')} onChange={(v) => patchCat('engine_cc', v)} />
              </Field>
              <Field label="최고출력 (hp)">
                <NumberInput value={gn(categorySpecs, 'horsepower')} onChange={(v) => patchCat('horsepower', v)} />
              </Field>
              <Field label="최대토크 (Nm)">
                <NumberInput value={gn(categorySpecs, 'torque_nm')} onChange={(v) => patchCat('torque_nm', v)} />
              </Field>
              <Field label="0-100 km/h (초)">
                <NumberInput value={gn(categorySpecs, 'acceleration_0_100')} onChange={(v) => patchCat('acceleration_0_100', v)} step="0.1" />
              </Field>
              <Field label="최고속도 (km/h)">
                <NumberInput value={gn(categorySpecs, 'top_speed_kmh')} onChange={(v) => patchCat('top_speed_kmh', v)} />
              </Field>
              <Field label="전기 주행거리 (km)">
                <NumberInput value={gn(categorySpecs, 'range_km')} onChange={(v) => patchCat('range_km', v)} />
              </Field>
              <Field label="배터리 용량 (kWh)">
                <NumberInput value={gn(categorySpecs, 'battery_kwh')} onChange={(v) => patchCat('battery_kwh', v)} step="any" />
              </Field>
              <Field label="연비 (km/L)">
                <NumberInput value={gn(categorySpecs, 'fuel_efficiency_km_l')} onChange={(v) => patchCat('fuel_efficiency_km_l', v)} step="any" />
              </Field>
              <Field label="승차 인원">
                <NumberInput value={gn(categorySpecs, 'seating')} onChange={(v) => patchCat('seating', v)} />
              </Field>
              <Field label="트렁크 용량 (L)">
                <NumberInput value={gn(categorySpecs, 'cargo_liters')} onChange={(v) => patchCat('cargo_liters', v)} />
              </Field>
              <Field label="공차중량 (kg)">
                <NumberInput value={gn(categorySpecs, 'curb_weight_kg')} onChange={(v) => patchCat('curb_weight_kg', v)} />
              </Field>
              <Field label="전장 (mm)">
                <NumberInput value={gn(categorySpecs, 'length_mm')} onChange={(v) => patchCat('length_mm', v)} />
              </Field>
              <Field label="전폭 (mm)">
                <NumberInput value={gn(categorySpecs, 'width_mm')} onChange={(v) => patchCat('width_mm', v)} />
              </Field>
              <Field label="전고 (mm)">
                <NumberInput value={gn(categorySpecs, 'height_mm')} onChange={(v) => patchCat('height_mm', v)} />
              </Field>
              <Field label="휠베이스 (mm)">
                <NumberInput value={gn(categorySpecs, 'wheelbase_mm')} onChange={(v) => patchCat('wheelbase_mm', v)} />
              </Field>
              <Field label="세그먼트">
                <TextInput value={g(categorySpecs, 'segment')} onChange={(v) => patchCat('segment', v)} placeholder="C-segment, SUV-C..." />
              </Field>
            </div>
          </SectionCard>
        )}

        {/* 같은 카테고리 제품 목록 */}
        {sameProducts.length > 0 && (
          <SectionCard title={`같은 카테고리 제품 (${sameProducts.length}개)`} defaultOpen={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 text-white/40 font-medium w-10"></th>
                    <th className="text-left pb-2 text-white/40 font-medium">제품명</th>
                    <th className="text-left pb-2 text-white/40 font-medium">브랜드</th>
                    <th className="pb-2 text-white/40 font-medium w-16 text-center">공개</th>
                    <th className="pb-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {sameProducts.map((p) => (
                    <tr key={p.id} className={`border-b border-border/40 ${p.id === id ? 'bg-accent/5' : 'hover:bg-white/5'} transition-colors`}>
                      <td className="py-2 pr-2">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-7 h-7 object-contain rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="w-7 h-7 rounded bg-white/5" />
                        )}
                      </td>
                      <td className="py-2 text-white/80 max-w-xs truncate">
                        {p.id === id ? <span className="text-accent font-semibold">{p.name} (현재)</span> : p.name}
                      </td>
                      <td className="py-2 text-white/40 text-xs">{p.brand}</td>
                      <td className="py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.is_visible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/20'}`}>
                          {p.is_visible ? '공개' : '비공개'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {p.id !== id && (
                          <Link
                            href={`/admin/products/${p.id}?category=${(form.category as string) || fromCategory}`}
                            className="text-xs text-white/30 hover:text-accent transition-colors px-2 py-1 rounded hover:bg-white/5"
                          >
                            편집
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* 저장 버튼 (하단) */}
        <div className="flex justify-end pb-8">
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
