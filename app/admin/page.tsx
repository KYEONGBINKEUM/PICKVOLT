'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Edit2, CheckCircle, AlertCircle, Circle,
  ChevronDown, Trash2, RefreshCw, Users, BarChart2,
  Package, LayoutDashboard, Clock, ImageOff, Plus, Cpu, Monitor, Zap,
  Eye, EyeOff,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES = ['', 'laptop', 'smartphone', 'tablet', 'smartwatch']
const BRANDS = ['', 'Samsung', 'Apple', 'HP', 'ASUS', 'Dell', 'Lenovo', 'LG', 'Sony']
const PAGE_SIZE = 50

type Tab = 'dashboard' | 'products' | 'users' | 'comparisons' | 'cpus' | 'gpus'

const CPU_BRANDS = ['Apple', 'Qualcomm', 'MediaTek', 'Samsung', 'Intel', 'AMD', 'NVIDIA', 'HiSilicon']
const GPU_BRANDS = ['Apple', 'Qualcomm (Adreno)', 'NVIDIA', 'AMD', 'Intel', 'ARM (Mali)', 'Imagination (PowerVR)', 'MediaTek']

function BrandSelector({ value, onChange, brands }: { value: string; onChange: (v: string) => void; brands: string[] }) {
  return (
    <div className="mb-4">
      <span className="text-xs text-white/30 block mb-2">브랜드</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {brands.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(value === b ? '' : b)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              value === b ? 'border-accent text-accent bg-accent/10' : 'border-border text-white/40 hover:border-white/20 hover:text-white'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="직접 입력..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-accent"
      />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'text-white' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-surface border border-border rounded-card p-5 flex items-start gap-4">
      <div className="mt-0.5 text-white/30">{icon}</div>
      <div>
        <p className="text-xs text-white/40 mb-1">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ImageStatus({ url }: { url: string | null }) {
  if (!url) return <Circle size={14} className="text-white/20" />
  if (url.includes('hp_og_logo') || url.includes('Sno/79183'))
    return <AlertCircle size={14} className="text-red-400" />
  return <CheckCircle size={14} className="text-emerald-400" />
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')

  // Dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // Products
  const [products, setProducts] = useState<{
    id: string; name: string; brand: string; category: string; image_url: string | null; scrape_status: string | null; is_visible: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    specs_common: any
  }[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [productCatTab, setProductCatTab] = useState<'smartphone' | 'tablet' | 'laptop'>('smartphone')
  const [brand, setBrand] = useState('')
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Users
  const [users, setUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; comparisons: number; plan: string; provider: string }[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)

  // Comparisons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comparisons, setComparisons] = useState<any[]>([])
  const [compLoading, setCompLoading] = useState(false)
  const [compPage, setCompPage] = useState(0)
  const [compTotal, setCompTotal] = useState(0)

  // CPUs
  const [cpus, setCpus] = useState<{ id: string; name: string; brand: string | null; type: string | null; cores: number | null; clock_base: number | null; clock_boost: number | null; gpu_name: string | null; gb6_single: number | null; gb6_multi: number | null; igpu_gb6_single: number | null; tdmark_score: number | null; antutu_score: number | null; cinebench_single: number | null; cinebench_multi: number | null; relative_score: number | null; score_source: string | null }[]>([])
  const [cpusLoading, setCpusLoading] = useState(false)
  const [cpuSearch, setCpuSearch] = useState('')
  const [cpuError, setCpuError] = useState<string | null>(null)
  const [editingCpuId, setEditingCpuId] = useState<string | null>(null)
  const [newCpuName, setNewCpuName] = useState('')
  const [newCpuType, setNewCpuType] = useState<'mobile' | 'laptop' | 'desktop'>('mobile')
  const [newCpuBrand, setNewCpuBrand] = useState('')
  const [newCpuCores, setNewCpuCores] = useState('')
  const [newCpuClockBase, setNewCpuClockBase] = useState('')
  const [newCpuClockBoost, setNewCpuClockBoost] = useState('')
  const [newCpuGpuName, setNewCpuGpuName] = useState('')
  const [newCpuGb6Single, setNewCpuGb6Single] = useState('')
  const [newCpuGb6Multi, setNewCpuGb6Multi] = useState('')
  const [newCpuIgpuSingle, setNewCpuIgpuSingle] = useState('')
  const [newCpuTdmark, setNewCpuTdmark] = useState('')
  const [newCpuAntutu, setNewCpuAntutu] = useState('')
  const [newCpuCbSingle, setNewCpuCbSingle] = useState('')
  const [newCpuCbMulti, setNewCpuCbMulti] = useState('')
  const [cpuTypeTab, setCpuTypeTab] = useState<'mobile' | 'laptop' | 'desktop'>('mobile')
  const [addingCpu, setAddingCpu] = useState(false)
  const [aiFillingCpu, setAiFillingCpu] = useState(false)
  const [aiCpuError, setAiCpuError] = useState<string | null>(null)

  // GPUs
  const [gpus, setGpus] = useState<{ id: string; name: string; brand: string | null; type: string | null; cores: number | null; gb6_single: number | null; gb6_opencl: number | null; tdmark_score: number | null; relative_score: number | null; score_source: string | null; cpu_id: string | null; cpus: { name: string } | null }[]>([])
  const [gpusLoading, setGpusLoading] = useState(false)
  const [gpuSearch, setGpuSearch] = useState('')
  const [gpuError, setGpuError] = useState<string | null>(null)
  const [editingGpuId, setEditingGpuId] = useState<string | null>(null)
  const [newGpuName, setNewGpuName] = useState('')
  const [newGpuBrand, setNewGpuBrand] = useState('')
  const [newGpuType, setNewGpuType] = useState<'mobile' | 'laptop' | 'desktop'>('mobile')
  const [newGpuCores, setNewGpuCores] = useState('')
  const [newGpuGb6Single, setNewGpuGb6Single] = useState('')
  const [newGpuGb6Opencl, setNewGpuGb6Opencl] = useState('')
  const [newGpuTdmark, setNewGpuTdmark] = useState('')
  const [newGpuCpuId, setNewGpuCpuId] = useState<string | null>(null)
  const [newGpuCpuName, setNewGpuCpuName] = useState('')
  const [gpuCpuQuery, setGpuCpuQuery] = useState('')
  const [gpuCpuResults, setGpuCpuResults] = useState<{ id: string; name: string }[]>([])
  const [addingGpu, setAddingGpu] = useState(false)
  const [aiFillingGpu, setAiFillingGpu] = useState(false)
  const [aiGpuError, setAiGpuError] = useState<string | null>(null)

  // Errors
  const [usersError, setUsersError] = useState<string | null>(null)
  const [compError, setCompError] = useState<string | null>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = (session?.user?.email ?? '').toLowerCase()
      if (!session) { router.replace('/login'); return }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) { router.replace('/'); return }
      setToken(session.access_token)
      setAuthed(true)
      setLoading(false)
    })
  }, [router])

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const fetchStats = useCallback(async (tok: string) => {
    setStatsLoading(true)
    const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) setStats(await res.json())
    setStatsLoading(false)
  }, [])

  const fetchProducts = useCallback(async () => {
    if (!authed) return
    let q = supabase
      .from('products')
      .select('id, name, brand, category, image_url, scrape_status, is_visible, specs_common(cpu_id)')
      .order('brand').order('name')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (search) q = q.ilike('name', `%${search}%`)
    if (category) q = q.eq('category', category)
    if (brand) q = q.eq('brand', brand)
    const { data } = await q
    setProducts(data ?? [])
  }, [authed, search, category, brand, page])

  // 탭이 바뀔 때 카테고리 필터 동기화
  useEffect(() => {
    setCategory(productCatTab)
    setPage(0)
  }, [productCatTab])

  const fetchUsers = useCallback(async (tok: string, pg: number, q = '') => {
    setUsersLoading(true)
    setUsersError(null)
    const params = new URLSearchParams({ page: String(pg) })
    if (q) params.set('q', q)
    const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const json = await res.json()
      setUsers(json.users ?? [])
      setUsersTotal(json.total ?? 0)
    } else {
      const json = await res.json().catch(() => ({}))
      setUsersError(json.error ?? `HTTP ${res.status}`)
    }
    setUsersLoading(false)
  }, [])

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    setUpdatingPlan(userId)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, plan: newPlan }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan: newPlan } : u))
    }
    setUpdatingPlan(null)
  }

  const fetchComparisons = useCallback(async (tok: string, pg: number) => {
    setCompLoading(true)
    setCompError(null)
    const res = await fetch(`/api/admin/comparisons?page=${pg}`, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const json = await res.json()
      setComparisons(json.comparisons ?? [])
      setCompTotal(json.total ?? 0)
    } else {
      const json = await res.json().catch(() => ({}))
      setCompError(json.error ?? `HTTP ${res.status}`)
    }
    setCompLoading(false)
  }, [])

  const fetchCpus = useCallback(async (q: string) => {
    setCpusLoading(true)
    setCpuError(null)
    const res = await fetch(`/api/admin/cpus?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const json = await res.json()
      setCpus(json.cpus ?? [])
    } else {
      setCpuError('CPU 목록을 불러올 수 없습니다')
    }
    setCpusLoading(false)
  }, [])

  const resetCpuForm = () => {
    setEditingCpuId(null)
    setNewCpuName('')
    setNewCpuBrand('')
    setNewCpuType('mobile')
    setNewCpuCores('')
    setNewCpuClockBase('')
    setNewCpuClockBoost('')
    setNewCpuGpuName('')
    setNewCpuGb6Single('')
    setNewCpuGb6Multi('')
    setNewCpuIgpuSingle('')
    setNewCpuTdmark('')
    setNewCpuAntutu('')
    setNewCpuCbSingle('')
    setNewCpuCbMulti('')
  }

  const cpuFormBody = () => ({
    name:             newCpuName.trim(),
    brand:            newCpuBrand.trim() || null,
    type:             newCpuType,
    cores:            newCpuCores      ? Number(newCpuCores)      : null,
    clock_base:       newCpuClockBase  ? Number(newCpuClockBase)  : null,
    clock_boost:      newCpuClockBoost ? Number(newCpuClockBoost) : null,
    gpu_name:         newCpuGpuName.trim() || null,
    gb6_single:       newCpuGb6Single  ? Number(newCpuGb6Single)  : null,
    gb6_multi:        newCpuGb6Multi   ? Number(newCpuGb6Multi)   : null,
    igpu_gb6_single:  newCpuIgpuSingle ? Number(newCpuIgpuSingle) : null,
    tdmark_score:     newCpuTdmark     ? Number(newCpuTdmark)     : null,
    antutu_score:     newCpuAntutu     ? Number(newCpuAntutu)     : null,
    cinebench_single: newCpuCbSingle   ? Number(newCpuCbSingle)   : null,
    cinebench_multi:  newCpuCbMulti    ? Number(newCpuCbMulti)    : null,
  })

  const handleAiFillCpu = async () => {
    if (!newCpuName.trim()) return
    setAiFillingCpu(true)
    setAiCpuError(null)
    try {
      const res = await fetch('/api/admin/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCpuName.trim(), kind: 'cpu' }),
      })
      const json = await res.json()
      if (!res.ok) { setAiCpuError(json.error ?? `HTTP ${res.status}`); return }
      const { specs } = json
      if (!specs) { setAiCpuError('응답에 specs 없음'); return }
      if (specs.brand)        setNewCpuBrand(specs.brand)
      if (specs.type)         setNewCpuType(specs.type as 'mobile' | 'laptop' | 'desktop')
      if (specs.cores != null)       setNewCpuCores(String(specs.cores))
      if (specs.clock_base != null)  setNewCpuClockBase(String(specs.clock_base))
      if (specs.clock_boost != null) setNewCpuClockBoost(String(specs.clock_boost))
      if (specs.gpu_name)            setNewCpuGpuName(specs.gpu_name)
      if (specs.gb6_single != null)  setNewCpuGb6Single(String(specs.gb6_single))
      if (specs.gb6_multi != null)   setNewCpuGb6Multi(String(specs.gb6_multi))
      if (specs.igpu_gb6_single != null) setNewCpuIgpuSingle(String(specs.igpu_gb6_single))
      if (specs.tdmark_score != null)       setNewCpuTdmark(String(specs.tdmark_score))
      if (specs.antutu_score != null)       setNewCpuAntutu(String(specs.antutu_score))
      if (specs.cinebench_single != null)   setNewCpuCbSingle(String(specs.cinebench_single))
      if (specs.cinebench_multi != null)    setNewCpuCbMulti(String(specs.cinebench_multi))
    } catch (e) {
      setAiCpuError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiFillingCpu(false)
    }
  }

  const handleAddCpu = async () => {
    if (!newCpuName.trim()) return
    setAddingCpu(true)
    setCpuError(null)
    try {
      const url = editingCpuId ? `/api/admin/cpus/${editingCpuId}` : '/api/admin/cpus'
      const method = editingCpuId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cpuFormBody()),
      })
      const json = await res.json()
      if (!res.ok) { setCpuError(json.error ?? `저장 실패 HTTP ${res.status}`); return }
      resetCpuForm()
      fetchCpus(cpuSearch)
    } catch (e) {
      setCpuError(e instanceof Error ? e.message : String(e))
    } finally {
      setAddingCpu(false)
    }
  }

  const handleEditCpu = (c: typeof cpus[0]) => {
    setEditingCpuId(c.id)
    setNewCpuName(c.name)
    setNewCpuBrand(c.brand ?? '')
    setNewCpuType((c.type as 'mobile' | 'laptop' | 'desktop') ?? 'mobile')
    setNewCpuCores(c.cores != null ? String(c.cores) : '')
    setNewCpuClockBase(c.clock_base != null ? String(c.clock_base) : '')
    setNewCpuClockBoost(c.clock_boost != null ? String(c.clock_boost) : '')
    setNewCpuGpuName(c.gpu_name ?? '')
    setNewCpuGb6Single(c.gb6_single != null ? String(c.gb6_single) : '')
    setNewCpuGb6Multi(c.gb6_multi != null ? String(c.gb6_multi) : '')
    setNewCpuIgpuSingle(c.igpu_gb6_single != null ? String(c.igpu_gb6_single) : '')
    setNewCpuTdmark(c.tdmark_score != null ? String(c.tdmark_score) : '')
    setNewCpuAntutu(c.antutu_score != null ? String(c.antutu_score) : '')
    setNewCpuCbSingle(c.cinebench_single != null ? String(c.cinebench_single) : '')
    setNewCpuCbMulti(c.cinebench_multi != null ? String(c.cinebench_multi) : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteCpu = async (id: string, name: string) => {
    if (!confirm(`"${name}" CPU를 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/cpus/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setCpus((p) => p.filter((c) => c.id !== id))
  }

  const fetchGpus = useCallback(async (q: string) => {
    setGpusLoading(true)
    setGpuError(null)
    const res = await fetch(`/api/admin/gpus?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const json = await res.json()
      setGpus(json.gpus ?? [])
    } else {
      setGpuError('GPU 목록을 불러올 수 없습니다')
    }
    setGpusLoading(false)
  }, [])

  const resetGpuForm = () => {
    setEditingGpuId(null)
    setNewGpuName('')
    setNewGpuBrand('')
    setNewGpuType('mobile')
    setNewGpuCores('')
    setNewGpuGb6Single('')
    setNewGpuGb6Opencl('')
    setNewGpuTdmark('')
    setNewGpuCpuId(null)
    setNewGpuCpuName('')
    setGpuCpuQuery('')
    setGpuCpuResults([])
  }

  const handleAiFillGpu = async () => {
    if (!newGpuName.trim()) return
    setAiFillingGpu(true)
    setAiGpuError(null)
    try {
      const res = await fetch('/api/admin/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGpuName.trim(), kind: 'gpu' }),
      })
      const json = await res.json()
      if (!res.ok) { setAiGpuError(json.error ?? `HTTP ${res.status}`); return }
      const { specs } = json
      if (!specs) { setAiGpuError('응답에 specs 없음'); return }
      if (specs.brand)        setNewGpuBrand(specs.brand)
      if (specs.type)         setNewGpuType(specs.type as 'mobile' | 'laptop' | 'desktop')
      if (specs.cores != null)       setNewGpuCores(String(specs.cores))
      if (specs.gb6_single != null)  setNewGpuGb6Single(String(specs.gb6_single))
      if (specs.gb6_opencl != null)  setNewGpuGb6Opencl(String(specs.gb6_opencl))
      if (specs.tdmark_score != null) setNewGpuTdmark(String(specs.tdmark_score))
    } catch (e) {
      setAiGpuError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiFillingGpu(false)
    }
  }

  const handleAddGpu = async () => {
    if (!newGpuName.trim()) return
    setAddingGpu(true)
    const body = {
      name:         newGpuName.trim(),
      brand:        newGpuBrand.trim() || null,
      type:         newGpuType,
      cores:        newGpuCores    ? Number(newGpuCores)    : null,
      gb6_single:   newGpuGb6Single  ? Number(newGpuGb6Single)  : null,
      gb6_opencl:   newGpuGb6Opencl  ? Number(newGpuGb6Opencl)  : null,
      tdmark_score: newGpuTdmark     ? Number(newGpuTdmark)     : null,
      cpu_id:       newGpuCpuId || null,
    }
    if (editingGpuId) {
      const res = await fetch(`/api/admin/gpus/${editingGpuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) { resetGpuForm(); fetchGpus(gpuSearch) }
    } else {
      const res = await fetch('/api/admin/gpus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) { resetGpuForm(); fetchGpus(gpuSearch) }
    }
    setAddingGpu(false)
  }

  const handleEditGpu = (g: typeof gpus[0]) => {
    setEditingGpuId(g.id)
    setNewGpuName(g.name)
    setNewGpuBrand(g.brand ?? '')
    setNewGpuType((g.type as 'mobile' | 'laptop' | 'desktop') ?? 'mobile')
    setNewGpuCores(g.cores != null ? String(g.cores) : '')
    setNewGpuGb6Single(g.gb6_single != null ? String(g.gb6_single) : '')
    setNewGpuGb6Opencl(g.gb6_opencl != null ? String(g.gb6_opencl) : '')
    setNewGpuTdmark(g.tdmark_score != null ? String(g.tdmark_score) : '')
    setNewGpuCpuId(g.cpu_id ?? null)
    setNewGpuCpuName(g.cpus?.name ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteGpu = async (id: string, name: string) => {
    if (!confirm(`"${name}" GPU를 삭제하시겠습니까?`)) return
    await fetch(`/api/admin/gpus/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setGpus((p) => p.filter((g) => g.id !== id))
  }

  // ── Effects by tab ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'dashboard') fetchStats(token)
  }, [authed, token, tab, fetchStats])

  useEffect(() => {
    if (!authed) return
    if (tab === 'products') fetchProducts()
  }, [authed, tab, fetchProducts])

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'users') fetchUsers(token, usersPage, userSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab, usersPage, fetchUsers])

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'comparisons') fetchComparisons(token, compPage)
  }, [authed, token, tab, compPage, fetchComparisons])

  useEffect(() => {
    if (!authed) return
    if (tab === 'cpus') fetchCpus(cpuSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab])

  useEffect(() => {
    if (!authed) return
    if (tab === 'gpus') fetchGpus(gpuSearch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab])

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleToggleVisible = async (id: string, current: boolean) => {
    setProducts((p) => p.map((x) => x.id === id ? { ...x, is_visible: !current } : x))
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: !current }),
    })
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`"${name}" 제품을 삭제하시겠습니까?`)) return
    setDeleting(id)
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setProducts((p) => p.filter((x) => x.id !== id))
    }
    setDeleting(null)
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
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

  if (!authed) return null

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={15} /> },
    { key: 'products', label: '제품 관리', icon: <Package size={15} /> },
    { key: 'users', label: '유저 관리', icon: <Users size={15} /> },
    { key: 'comparisons', label: '비교 이력', icon: <BarChart2 size={15} /> },
    { key: 'cpus', label: 'CPU 관리', icon: <Cpu size={15} /> },
    { key: 'gpus', label: 'GPU 관리', icon: <Monitor size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="font-bold text-white text-base">pickvolt</span>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 font-medium">admin</span>
        </div>
        <Link href="/mypage" className="text-sm text-white/40 hover:text-white transition-colors">my page</Link>
      </div>

      {/* Tab nav */}
      <div className="border-b border-border px-6">
        <div className="flex gap-0 max-w-7xl mx-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-accent text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">대시보드</h1>
              <button
                onClick={() => fetchStats(token)}
                disabled={statsLoading}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors disabled:opacity-40"
              >
                <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>

            {statsLoading && !stats ? (
              <div className="flex gap-1.5 py-12 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <StatCard icon={<Package size={18} />} label="전체 제품" value={stats.totalProducts} />
                  <StatCard icon={<Users size={18} />} label="전체 유저" value={stats.totalUsers} />
                  <StatCard icon={<BarChart2 size={18} />} label="오늘 비교" value={stats.todayComparisons} sub={`총 ${stats.totalComparisons}회`} />
                  <StatCard icon={<ImageOff size={18} />} label="이미지 없음" value={stats.noImage} color={stats.noImage > 0 ? 'text-amber-400' : 'text-white'} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  <StatCard icon={<CheckCircle size={18} />} label="스크랩 완료" value={stats.scrapeOk} color="text-emerald-400" />
                  <StatCard icon={<Clock size={18} />} label="스크랩 대기" value={stats.scrapePending} color="text-amber-400" />
                  <StatCard icon={<AlertCircle size={18} />} label="스크랩 실패" value={stats.scrapeFailed} color={stats.scrapeFailed > 0 ? 'text-red-400' : 'text-white'} />
                </div>

                <div className="bg-surface border border-border rounded-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-white">최근 비교</p>
                  </div>
                  {(stats.recentComparisons ?? []).length === 0 ? (
                    <p className="px-5 py-6 text-sm text-white/30 text-center">비교 기록 없음</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {stats.recentComparisons.map((c: { id: string; title: string; created_at: string; user_id: string }) => (
                          <tr key={c.id} className="border-b border-border/50 last:border-0">
                            <td className="px-5 py-3 text-white/80 max-w-xs truncate">{c.title}</td>
                            <td className="px-5 py-3 text-white/30 text-xs text-right">{formatDate(c.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">제품 관리</h1>
              <Link
                href="/admin/products/new"
                className="flex items-center gap-1.5 text-sm bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={14} />
                새 제품 추가
              </Link>
            </div>

            {/* 카테고리 탭 */}
            <div className="flex gap-1 mb-5 border-b border-border">
              {([
                { key: 'smartphone', label: '스마트폰' },
                { key: 'tablet',     label: '태블릿'   },
                { key: 'laptop',     label: '랩탑'     },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setProductCatTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    productCatTab === t.key ? 'border-accent text-white' : 'border-transparent text-white/40 hover:text-white/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="제품명 검색..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                  className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent"
                />
              </div>
              <div className="relative">
                <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(0) }}
                  className="appearance-none bg-surface border border-border rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-accent">
                  {BRANDS.map((b) => <option key={b} value={b}>{b || '전체 브랜드'}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-white/40 font-medium w-10"></th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">제품명</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">브랜드</th>
                    <th className="px-4 py-3 text-white/40 font-medium w-8">이미지</th>
                    <th className="px-4 py-3 text-white/40 font-medium w-8 hidden md:table-cell" title="CPU 연결 여부">CPU</th>
                    <th className="px-4 py-3 text-white/40 font-medium w-8" title="공개 여부">공개</th>
                    <th className="w-20 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="px-4 py-2">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="w-8 h-8 object-contain rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div className="w-8 h-8 rounded bg-white/5" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-white/90 max-w-xs truncate">{p.name}</td>
                      <td className="px-4 py-2 text-white/50 hidden md:table-cell">{p.brand}</td>
                      <td className="px-4 py-2">
                        <ImageStatus url={p.image_url} />
                      </td>
                      <td className="px-4 py-2 hidden md:table-cell">
                        {p.specs_common?.cpu_id
                          ? <CheckCircle size={14} className="text-emerald-400" />
                          : <AlertCircle size={14} className="text-amber-400" />}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleToggleVisible(p.id, p.is_visible)}
                          title={p.is_visible ? '공개 중 (클릭 시 비공개)' : '비공개 (클릭 시 공개)'}
                          className="p-1.5 rounded transition-colors"
                        >
                          {p.is_visible
                            ? <Eye size={14} className="text-emerald-400" />
                            : <EyeOff size={14} className="text-white/20" />}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/products/${p.id}`}
                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-accent transition-colors inline-flex">
                            <Edit2 size={13} />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            disabled={deleting === p.id}
                            className="p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors inline-flex disabled:opacity-40"
                          >
                            {deleting === p.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">제품 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-white/40">
              <span>{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + products.length} 표시</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  이전
                </button>
                <button onClick={() => setPage((p) => p + 1)} disabled={products.length < PAGE_SIZE}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  다음
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-black">유저 관리 <span className="text-sm font-normal text-white/30 ml-2">총 {usersTotal}명</span></h1>
              <button onClick={() => fetchUsers(token, usersPage, userSearch)} disabled={usersLoading}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors disabled:opacity-40">
                <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} />새로고침
              </button>
            </div>

            {/* 이메일 검색 */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="이메일 검색..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value)
                  setUsersPage(1)
                  fetchUsers(token, 1, e.target.value)
                }}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent"
              />
            </div>

            {usersError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                오류: {usersError}
                {usersError.includes('unauthorized') || usersError.includes('500') ? (
                  <span className="text-white/30 ml-2">— SUPABASE_SERVICE_ROLE_KEY 환경변수를 확인하세요</span>
                ) : null}
              </div>
            )}

            {usersLoading && users.length === 0 ? (
              <div className="flex gap-1.5 py-12 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-white/40 font-medium">이메일</th>
                      <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">가입일</th>
                      <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">마지막 로그인</th>
                      <th className="text-right px-4 py-3 text-white/40 font-medium">비교수</th>
                      <th className="text-center px-4 py-3 text-white/40 font-medium">플랜</th>
                      <th className="text-center px-4 py-3 text-white/40 font-medium hidden md:table-cell">로그인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-3 text-white/80 max-w-xs truncate">{u.email}</td>
                        <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">{formatDate(u.last_sign_in_at)}</td>
                        <td className="px-4 py-3 text-white/70 text-right font-mono">{u.comparisons}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleUpdatePlan(u.id, u.plan === 'pro' ? 'free' : 'pro')}
                            disabled={updatingPlan === u.id}
                            className={`flex items-center justify-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-colors mx-auto ${
                              u.plan === 'pro'
                                ? 'bg-accent/20 text-accent hover:bg-accent/30'
                                : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                            } disabled:opacity-40`}
                          >
                            {updatingPlan === u.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : u.plan === 'pro' ? (
                              <><Zap size={10} />pro</>
                            ) : (
                              'free'
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className="text-xs text-white/30">{u.provider}</span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">유저 없음</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 text-sm text-white/40">
              <span>페이지 {usersPage}</span>
              <div className="flex gap-2">
                <button onClick={() => setUsersPage((p) => Math.max(1, p - 1))} disabled={usersPage <= 1}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  이전
                </button>
                <button onClick={() => setUsersPage((p) => p + 1)} disabled={users.length < 50}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  다음
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARISONS ── */}
        {tab === 'comparisons' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">비교 이력 <span className="text-sm font-normal text-white/30 ml-2">총 {compTotal}건</span></h1>
              <button onClick={() => fetchComparisons(token, compPage)} disabled={compLoading}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors disabled:opacity-40">
                <RefreshCw size={13} className={compLoading ? 'animate-spin' : ''} />새로고침
              </button>
            </div>

            {compError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                오류: {compError}
              </div>
            )}

            {compLoading && comparisons.length === 0 ? (
              <div className="flex gap-1.5 py-12 justify-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-white/40 font-medium">비교 제목</th>
                      <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">유저</th>
                      <th className="text-right px-4 py-3 text-white/40 font-medium">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((c, i) => (
                      <tr key={c.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-3 text-white/80 max-w-xs truncate">{c.title}</td>
                        <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell truncate max-w-[180px]">{c.user_email}</td>
                        <td className="px-4 py-3 text-white/30 text-xs text-right whitespace-nowrap">{formatDate(c.created_at)}</td>
                      </tr>
                    ))}
                    {comparisons.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-white/30">비교 기록 없음</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 text-sm text-white/40">
              <span>{compPage * 50 + 1}–{compPage * 50 + comparisons.length} 표시</span>
              <div className="flex gap-2">
                <button onClick={() => setCompPage((p) => Math.max(0, p - 1))} disabled={compPage === 0}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  이전
                </button>
                <button onClick={() => setCompPage((p) => p + 1)} disabled={comparisons.length < 50}
                  className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  다음
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CPUS ── */}
        {tab === 'cpus' && (
          <div>
            <h1 className="text-2xl font-black mb-6">CPU 관리</h1>

            {/* Add / Edit CPU form */}
            <div className="bg-surface border border-border rounded-card p-5 mb-6">
              <p className="text-sm font-semibold text-white mb-4">
                {editingCpuId ? '✏️ CPU 수정' : '새 CPU 추가'}
              </p>

              {/* 브랜드 */}
              <BrandSelector
                value={newCpuBrand}
                onChange={setNewCpuBrand}
                brands={CPU_BRANDS}
              />

              {/* 타입 선택 */}
              <div className="flex gap-2 mb-4">
                {(['mobile', 'laptop', 'desktop'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewCpuType(t)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      newCpuType === t ? 'bg-accent text-white' : 'border border-border text-white/40 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {t === 'mobile' ? '모바일' : t === 'laptop' ? '랩탑' : '데스크탑'}
                  </button>
                ))}
              </div>

              {/* 이름 + AI */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder={newCpuType === 'mobile' ? 'SoC 이름 (예: Apple A19 Pro)' : newCpuType === 'laptop' ? 'CPU 이름 (예: Intel Core Ultra 9 285H)' : 'CPU 이름 (예: AMD Ryzen 9 9950X)'}
                  value={newCpuName}
                  onChange={(e) => setNewCpuName(e.target.value)}
                  className="flex-1 min-w-[200px] bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAiFillCpu}
                  disabled={aiFillingCpu || !newCpuName.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  {aiFillingCpu ? <RefreshCw size={12} className="animate-spin" /> : <span>✦</span>}
                  AI 자동입력
                </button>
              </div>
              {aiCpuError && (
                <p className="text-xs text-red-400 mb-3">AI 오류: {aiCpuError}</p>
              )}

              {/* 모바일 벤치마크 */}
              {newCpuType === 'mobile' && (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="text-xs text-white/30 w-full">Geekbench 6 CPU</span>
                    <input
                      type="number"
                      placeholder="GB6 Single (예: 2800)"
                      value={newCpuGb6Single}
                      onChange={(e) => setNewCpuGb6Single(e.target.value)}
                      className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      placeholder="GB6 Multi (예: 7500)"
                      value={newCpuGb6Multi}
                      onChange={(e) => setNewCpuGb6Multi(e.target.value)}
                      className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="text-xs text-white/30 w-full">3DMark Steel Nomad Light / AnTuTu</span>
                    <input
                      type="number"
                      placeholder="3DMark Steel Nomad Light"
                      value={newCpuTdmark}
                      onChange={(e) => setNewCpuTdmark(e.target.value)}
                      className="w-52 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      placeholder="AnTuTu 점수"
                      value={newCpuAntutu}
                      onChange={(e) => setNewCpuAntutu(e.target.value)}
                      className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}

              {/* 랩탑/데스크탑 벤치마크 */}
              {(newCpuType === 'laptop' || newCpuType === 'desktop') && (
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="text-xs text-white/30 w-full">Cinebench</span>
                  <input
                    type="number"
                    placeholder="Cinebench Single (예: 130)"
                    value={newCpuCbSingle}
                    onChange={(e) => setNewCpuCbSingle(e.target.value)}
                    className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                  />
                  <input
                    type="number"
                    placeholder="Cinebench Multi (예: 1800)"
                    value={newCpuCbMulti}
                    onChange={(e) => setNewCpuCbMulti(e.target.value)}
                    className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAddCpu}
                  disabled={addingCpu || !newCpuName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                >
                  {addingCpu ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  {editingCpuId ? '저장' : '추가'}
                </button>
                {editingCpuId && (
                  <button onClick={resetCpuForm} className="px-4 py-2 border border-border text-white/50 hover:text-white text-sm rounded-lg transition-colors">
                    취소
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="CPU 검색..."
                value={cpuSearch}
                onChange={(e) => { setCpuSearch(e.target.value); fetchCpus(e.target.value) }}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent"
              />
            </div>

            {cpuError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                {cpuError}
              </div>
            )}

            {/* 서브탭 */}
            <div className="flex gap-1 mb-4 border-b border-border">
              {(['mobile', 'laptop', 'desktop'] as const).map((t) => {
                const count = cpus.filter((c) => (c.type ?? 'mobile') === t).length
                return (
                  <button
                    key={t}
                    onClick={() => setCpuTypeTab(t)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                      cpuTypeTab === t ? 'border-accent text-white' : 'border-transparent text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t === 'mobile' ? '모바일' : t === 'laptop' ? '랩탑' : '데스크탑'}
                    <span className="text-xs text-white/30">{count}</span>
                  </button>
                )
              })}
            </div>

            <div className="bg-surface border border-border rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-white/40 font-medium">이름</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">브랜드</th>
                    {cpuTypeTab === 'mobile' ? (
                      <>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">GB6 Single</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">GB6 Multi</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">3DMark</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">AnTuTu</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">CB Single</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">CB Multi</th>
                      </>
                    )}
                    <th className="text-right px-4 py-3 text-white/40 font-medium">상대점수</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {cpusLoading && cpus.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center">
                      <div className="flex gap-1.5 justify-center">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </td></tr>
                  ) : cpus.filter((c) => (c.type ?? 'mobile') === cpuTypeTab).map((c, i) => (
                    <tr key={c.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="px-4 py-3 text-white/80 max-w-[200px] truncate">
                        <div className="truncate">{c.name}</div>
                        {c.gpu_name && <div className="text-xs text-white/30 truncate">{c.gpu_name}</div>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.brand && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{c.brand}</span>}
                      </td>
                      {cpuTypeTab === 'mobile' ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{c.gb6_single ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{c.gb6_multi ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{c.tdmark_score ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">
                            {c.antutu_score != null ? c.antutu_score.toLocaleString() : '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{c.cinebench_single ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{c.cinebench_multi ?? '—'}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right font-mono">
                        {c.relative_score !== null ? (
                          <span className={c.relative_score >= 800 ? 'text-emerald-400' : c.relative_score >= 500 ? 'text-amber-400' : 'text-white/50'}>
                            {c.relative_score}
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditCpu(c)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-accent transition-colors">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteCpu(c.id, c.name)} className="p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!cpusLoading && cpus.filter((c) => (c.type ?? 'mobile') === cpuTypeTab).length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-white/30">
                      {cpuTypeTab === 'mobile' ? '모바일' : cpuTypeTab === 'laptop' ? '랩탑' : '데스크탑'} CPU 없음
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/20 mt-3">검색어를 입력하면 실시간으로 필터됩니다. 최대 20개 표시.</p>
          </div>
        )}

        {/* ── GPUS ── */}
        {tab === 'gpus' && (
          <div>
            <h1 className="text-2xl font-black mb-6">GPU 관리</h1>

            {/* Add / Edit GPU form */}
            <div className="bg-surface border border-border rounded-card p-5 mb-6">
              <p className="text-sm font-semibold text-white mb-4">
                {editingGpuId ? '✏️ GPU 수정' : '새 GPU 추가'}
              </p>

              <BrandSelector value={newGpuBrand} onChange={setNewGpuBrand} brands={GPU_BRANDS} />

              {/* 타입 */}
              <div className="flex gap-2 mb-4">
                {(['mobile', 'laptop', 'desktop'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setNewGpuType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newGpuType === t ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                    {t === 'mobile' ? '모바일' : t === 'laptop' ? '랩탑' : '데스크탑'}
                  </button>
                ))}
              </div>

              {/* 기본 정보 */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs text-white/30 w-full">기본 정보</span>
                <input
                  type="text"
                  placeholder="GPU 이름 (예: Adreno 750)"
                  value={newGpuName}
                  onChange={(e) => setNewGpuName(e.target.value)}
                  className="flex-1 min-w-[200px] bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAiFillGpu}
                  disabled={aiFillingGpu || !newGpuName.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  {aiFillingGpu ? <RefreshCw size={12} className="animate-spin" /> : <span>✦</span>}
                  AI 자동입력
                </button>
                <input
                  type="number"
                  placeholder="코어 수 (예: 10)"
                  value={newGpuCores}
                  onChange={(e) => setNewGpuCores(e.target.value)}
                  className="w-36 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>
              {aiGpuError && (
                <p className="text-xs text-red-400 mb-3">AI 오류: {aiGpuError}</p>
              )}

              {/* 프로세서 연동 (CPU) */}
              <div className="mb-4">
                <span className="text-xs text-white/30 block mb-2">프로세서 연동 (선택, iGPU)</span>
                {newGpuCpuId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-accent">{newGpuCpuName}</span>
                    <button type="button" onClick={() => { setNewGpuCpuId(null); setNewGpuCpuName(''); setGpuCpuQuery(''); setGpuCpuResults([]) }}
                      className="text-xs text-white/30 hover:text-red-400 transition-colors">✕ 해제</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="CPU 이름으로 검색..."
                      value={gpuCpuQuery}
                      onChange={async (e) => {
                        setGpuCpuQuery(e.target.value)
                        if (e.target.value.length < 2) { setGpuCpuResults([]); return }
                        const res = await fetch(`/api/admin/cpus?q=${encodeURIComponent(e.target.value)}`)
                        const j = await res.json()
                        setGpuCpuResults(j.cpus ?? [])
                      }}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                    {gpuCpuResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-surface-2 border border-border rounded-lg overflow-hidden z-10 shadow-xl">
                        {gpuCpuResults.map((c) => (
                          <button key={c.id} type="button"
                            onClick={() => { setNewGpuCpuId(c.id); setNewGpuCpuName(c.name); setGpuCpuQuery(''); setGpuCpuResults([]) }}
                            className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 벤치마크 */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs text-white/30 w-full">Geekbench GPU</span>
                <input
                  type="number"
                  placeholder="GB6 Compute/Metal/Vulkan"
                  value={newGpuGb6Single}
                  onChange={(e) => setNewGpuGb6Single(e.target.value)}
                  className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="GB6 OpenCL"
                  value={newGpuGb6Opencl}
                  onChange={(e) => setNewGpuGb6Opencl(e.target.value)}
                  className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs text-white/30 w-full">3DMark (선택)</span>
                <input
                  type="number"
                  placeholder="3DMark 점수"
                  value={newGpuTdmark}
                  onChange={(e) => setNewGpuTdmark(e.target.value)}
                  className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddGpu}
                  disabled={addingGpu || !newGpuName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                >
                  {addingGpu ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
                  {editingGpuId ? '저장' : '추가'}
                </button>
                {editingGpuId && (
                  <button onClick={resetGpuForm} className="px-4 py-2 border border-border text-white/50 hover:text-white text-sm rounded-lg transition-colors">
                    취소
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="GPU 검색..."
                value={gpuSearch}
                onChange={(e) => { setGpuSearch(e.target.value); fetchGpus(e.target.value) }}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent"
              />
            </div>

            {gpuError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
                {gpuError}
              </div>
            )}

            <div className="bg-surface border border-border rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-white/40 font-medium">이름</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">브랜드</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium hidden md:table-cell">타입</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">GB6 Compute</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium">상대점수</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {gpusLoading && gpus.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex gap-1.5 justify-center">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </td></tr>
                  ) : gpus.map((g, i) => (
                    <tr key={g.id} className={`border-b border-border/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                      <td className="px-4 py-3 text-white/80 max-w-[180px] truncate">{g.name}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {g.brand && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{g.brand}</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {g.type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.type === 'mobile' ? 'bg-blue-500/20 text-blue-300' : g.type === 'laptop' ? 'bg-purple-500/20 text-purple-300' : 'bg-orange-500/20 text-orange-300'}`}>
                            {g.type === 'mobile' ? '모바일' : g.type === 'laptop' ? '랩탑' : '데스크탑'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{g.gb6_single ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {g.relative_score !== null ? (
                          <span className={g.relative_score >= 800 ? 'text-emerald-400' : g.relative_score >= 500 ? 'text-amber-400' : 'text-white/50'}>
                            {g.relative_score}
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEditGpu(g)} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-accent transition-colors">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteGpu(g.id, g.name)} className="p-1.5 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!gpusLoading && gpus.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">GPU 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/20 mt-3">검색어를 입력하면 실시간으로 필터됩니다. 최대 10개 표시.</p>
          </div>
        )}

      </div>
    </div>
  )
}
