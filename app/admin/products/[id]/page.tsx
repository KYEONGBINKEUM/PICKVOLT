'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES = ['laptop', 'smartphone', 'tablet', 'smartwatch']
const SCRAPE_STATUSES = ['ok', 'pending', 'failed', 'partial']
const STORAGE_TYPES = ['SSD', 'HDD', 'eMMC', 'UFS']
const DISPLAY_TYPES = ['IPS', 'OLED', 'AMOLED', 'LTPO OLED', 'VA', 'TN', 'Mini-LED', 'Liquid Retina']

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

function NumberInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProductEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [authed, setAuthed] = useState(false)
  const [token, setToken] = useState('')
  const [product, setProduct] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [commonSpecs, setCommonSpecs] = useState<Record<string, unknown>>({})
  const [categorySpecs, setCategorySpecs] = useState<Record<string, unknown>>({})
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = (session?.user?.email ?? '').toLowerCase()
      if (!session) { router.replace('/login'); return }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) { router.replace('/'); return }
      setToken(session.access_token)
      setAuthed(true)
    })
  }, [router])

  useEffect(() => {
    if (!authed) return
    supabase
      .from('products')
      .select(`
        id, name, brand, category, image_url, price_usd, source_url, scrape_status,
        specs_common(*),
        specs_laptop(*),
        specs_smartphone(*),
        specs_tablet(*),
        specs_smartwatch(*)
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
        })
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
      })
  }, [authed, id])

  const patchForm = (field: string, value: unknown) => {
    setForm((p) => ({ ...p, [field]: value }))
    if (field === 'image_url') setImagePreview(String(value ?? ''))
    if (field === 'category') setCategorySpecs({})
  }
  const patchCommon = (field: string, value: unknown) => setCommonSpecs((p) => ({ ...p, [field]: value }))
  const patchCat = (field: string, value: unknown) => setCategorySpecs((p) => ({ ...p, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const category = (form.category as string) ?? ''
      const body: Record<string, unknown> = {
        ...form,
        specs_common: commonSpecs,
        [`specs_${category}`]: categorySpecs,
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
      <div className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm">
            <ArrowLeft size={14} />
            관리자
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 truncate max-w-xs">{product.name as string}</span>
        </div>
        <div className="flex items-center gap-3">
          {(form.source_url as string) && (
            <a href={form.source_url as string} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
              <ExternalLink size={13} />소스
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
            <Field label="브랜드">
              <TextInput value={g(form, 'brand')} onChange={(v) => patchForm('brand', v)} />
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
            <div className="md:col-span-2">
              <Field label="소스 URL">
                <TextInput value={g(form, 'source_url')} onChange={(v) => patchForm('source_url', v)} placeholder="https://..." />
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── 공통 스펙 ── */}
        <SectionCard title="공통 스펙 (specs_common)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="CPU 이름">
              <TextInput value={g(commonSpecs, 'cpu_name')} onChange={(v) => patchCommon('cpu_name', v)} placeholder="Apple M4 Pro" />
            </Field>
            <Field label="GPU 이름">
              <TextInput value={g(commonSpecs, 'gpu_name')} onChange={(v) => patchCommon('gpu_name', v)} placeholder="Apple M4 Pro GPU" />
            </Field>
            <Field label="CPU 코어 수">
              <NumberInput value={gn(commonSpecs, 'cpu_cores')} onChange={(v) => patchCommon('cpu_cores', v)} />
            </Field>
            <Field label="CPU 클럭">
              <TextInput value={g(commonSpecs, 'cpu_clock')} onChange={(v) => patchCommon('cpu_clock', v)} placeholder="3.5 GHz base / 4.2 GHz boost" />
            </Field>
            <Field label="GPU 코어 수">
              <NumberInput value={gn(commonSpecs, 'gpu_cores')} onChange={(v) => patchCommon('gpu_cores', v)} />
            </Field>
            <Field label="RAM (GB)">
              <NumberInput value={gn(commonSpecs, 'ram_gb')} onChange={(v) => patchCommon('ram_gb', v)} />
            </Field>
            <Field label="RAM 타입">
              <TextInput value={g(commonSpecs, 'ram_type')} onChange={(v) => patchCommon('ram_type', v)} placeholder="LPDDR5X, Unified Memory..." />
            </Field>
            <Field label="스토리지 (GB)">
              <NumberInput value={gn(commonSpecs, 'storage_gb')} onChange={(v) => patchCommon('storage_gb', v)} />
            </Field>
            <Field label="스토리지 타입 (쉼표로 여러 개 가능)">
              <TextInput value={g(commonSpecs, 'storage_type')} onChange={(v) => patchCommon('storage_type', v)} placeholder="SSD, HDD" />
            </Field>
            <Field label="OS">
              <TextInput value={g(commonSpecs, 'os')} onChange={(v) => patchCommon('os', v)} placeholder="macOS 15, Android 15..." />
            </Field>
            <Field label="Wi-Fi 규격">
              <TextInput value={g(commonSpecs, 'wifi_standard')} onChange={(v) => patchCommon('wifi_standard', v)} placeholder="Wi-Fi 6E" />
            </Field>
            <Field label="블루투스">
              <TextInput value={g(commonSpecs, 'bluetooth_version')} onChange={(v) => patchCommon('bluetooth_version', v)} placeholder="5.3" />
            </Field>
            <Field label="출시연도">
              <NumberInput value={gn(commonSpecs, 'launch_year')} onChange={(v) => patchCommon('launch_year', v)} />
            </Field>
            <Field label="출시가격 (USD)">
              <NumberInput value={gn(commonSpecs, 'launch_price_usd')} onChange={(v) => patchCommon('launch_price_usd', v)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="색상 옵션 (쉼표 구분)">
                <TextInput value={g(commonSpecs, 'colors')} onChange={(v) => patchCommon('colors', v)} placeholder="Space Black, Silver, Starlight" />
              </Field>
            </div>
          </div>
        </SectionCard>

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
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} options={DISPLAY_TYPES} />
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
              <Field label="배터리 사용시간 (h)">
                <NumberInput value={gn(categorySpecs, 'battery_hours')} onChange={(v) => patchCat('battery_hours', v)} />
              </Field>
              <Field label="충전 와트 (W)">
                <NumberInput value={gn(categorySpecs, 'charging_watt')} onChange={(v) => patchCat('charging_watt', v)} />
              </Field>
              <Field label="웹캠 해상도">
                <TextInput value={g(categorySpecs, 'webcam_resolution')} onChange={(v) => patchCat('webcam_resolution', v)} placeholder="1080p" />
              </Field>
              <div className="md:col-span-2">
                <Field label="포트 (JSON)">
                  <TextInput value={g(categorySpecs, 'ports')} onChange={(v) => patchCat('ports', v)} placeholder='{"usb_c":3,"hdmi":1,"sd_card":true}' />
                </Field>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-white/40 mb-2">옵션</label>
                <div className="flex flex-wrap gap-2">
                  <Toggle value={gb(categorySpecs, 'display_touch')} onChange={(v) => patchCat('display_touch', v)} label="터치 디스플레이" />
                  <Toggle value={gb(categorySpecs, 'has_fingerprint')} onChange={(v) => patchCat('has_fingerprint', v)} label="지문인식" />
                  <Toggle value={gb(categorySpecs, 'has_face_id')} onChange={(v) => patchCat('has_face_id', v)} label="Face ID" />
                </div>
              </div>
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
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} options={DISPLAY_TYPES} />
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
                <NumberInput value={gn(categorySpecs, 'wireless_charging_watt')} onChange={(v) => patchCat('wireless_charging_watt', v)} />
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
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} options={DISPLAY_TYPES} />
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
              <Field label="배터리 사용시간 (h)">
                <NumberInput value={gn(categorySpecs, 'battery_hours')} onChange={(v) => patchCat('battery_hours', v)} />
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
              <Field label="패널 타입">
                <SelectInput value={g(categorySpecs, 'display_type')} onChange={(v) => patchCat('display_type', v)} options={DISPLAY_TYPES} />
              </Field>
              <Field label="칩 이름">
                <TextInput value={g(categorySpecs, 'chip_name')} onChange={(v) => patchCat('chip_name', v)} placeholder="S10, Exynos W1000..." />
              </Field>
              <Field label="배터리 사용시간 (h)">
                <NumberInput value={gn(categorySpecs, 'battery_hours')} onChange={(v) => patchCat('battery_hours', v)} />
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
