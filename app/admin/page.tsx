'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Edit2, CheckCircle, AlertCircle, Circle,
  ChevronDown, Trash2, RefreshCw, Users, BarChart2,
  Package, LayoutDashboard, Clock, ImageOff, Plus, Cpu, Monitor, Zap,
  Eye, EyeOff, Copy, Flag, Mail, Pencil, PlusCircle, BadgeCheck,
  MessageSquare, Pin, PinOff, Settings2, Coins,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES = ['', 'laptop', 'smartphone', 'tablet', 'smartwatch']
const BRANDS = ['', 'Samsung', 'Apple', 'HP', 'ASUS', 'Dell', 'Lenovo', 'LG', 'Sony']
const PAGE_SIZE = 50

type Tab = 'dashboard' | 'products' | 'users' | 'comparisons' | 'cpus' | 'gpus' | 'reports' | 'inquiries' | 'edit_requests' | 'add_requests' | 'verify_requests' | 'community'

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
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // Users
  const [users, setUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; comparisons: number; plan: string; provider: string; posts: number; comments: number }[]>([])
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
  const [cpus, setCpus] = useState<{ id: string; name: string; brand: string | null; type: string | null; cores: number | null; clock_base: number | null; clock_boost: number | null; gpu_name: string | null; gb6_single: number | null; gb6_multi: number | null; igpu_gb6_single: number | null; tdmark_score: number | null; antutu_score: number | null; cinebench_single: number | null; cinebench_multi: number | null; passmark_single: number | null; passmark_multi: number | null; tdp: number | null; process_nm: number | null; gpu_id: string | null; gpus: { name: string } | null; relative_score: number | null; score_source: string | null }[]>([])
  const [cpusLoading, setCpusLoading] = useState(false)
  const [cpuSearch, setCpuSearch] = useState('')
  const [cpuError, setCpuError] = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
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
  const [newCpuPassmarkSingle, setNewCpuPassmarkSingle] = useState('')
  const [newCpuPassmarkMulti, setNewCpuPassmarkMulti] = useState('')
  const [newCpuTdp, setNewCpuTdp] = useState('')
  const [newCpuProcessNm, setNewCpuProcessNm] = useState('')
  const [newCpuGpuId, setNewCpuGpuId] = useState<string | null>(null)
  const [newCpuLinkedGpuName, setNewCpuLinkedGpuName] = useState('')
  const [cpuGpuQuery, setCpuGpuQuery] = useState('')
  const [cpuGpuResults, setCpuGpuResults] = useState<{ id: string; name: string }[]>([])
  const [cpuTypeTab, setCpuTypeTab] = useState<'mobile' | 'laptop' | 'desktop'>('mobile')
  const [addingCpu, setAddingCpu] = useState(false)
  const [aiFillingCpu, setAiFillingCpu] = useState(false)
  const [aiCpuError, setAiCpuError] = useState<string | null>(null)

  // GPUs
  const [gpus, setGpus] = useState<{ id: string; name: string; brand: string | null; type: string | null; cores: number | null; gb6_single: number | null; gb6_ml_single: number | null; gb6_ml_half: number | null; gb6_ml_quantized: number | null; relative_score: number | null; score_source: string | null }[]>([])
  const [gpusLoading, setGpusLoading] = useState(false)
  const [gpuSearch, setGpuSearch] = useState('')
  const [gpuError, setGpuError] = useState<string | null>(null)
  const [editingGpuId, setEditingGpuId] = useState<string | null>(null)
  const [newGpuName, setNewGpuName] = useState('')
  const [newGpuBrand, setNewGpuBrand] = useState('')
  const [newGpuType, setNewGpuType] = useState<'laptop' | 'desktop'>('laptop')
  const [newGpuCores, setNewGpuCores] = useState('')
  const [newGpuGb6Single, setNewGpuGb6Single] = useState('')
  const [newGpuGb6MlSingle, setNewGpuGb6MlSingle] = useState('')
  const [newGpuGb6MlHalf, setNewGpuGb6MlHalf] = useState('')
  const [newGpuGb6MlQuantized, setNewGpuGb6MlQuantized] = useState('')
  const [addingGpu, setAddingGpu] = useState(false)
  const [aiFillingGpu, setAiFillingGpu] = useState(false)
  const [aiGpuError, setAiGpuError] = useState<string | null>(null)

  // Reports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsFilter, setReportsFilter] = useState('')

  // Inquiries (contact form)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inquiries, setInquiries] = useState<any[]>([])
  const [inquiriesLoading, setInquiriesLoading] = useState(false)
  const [inquiriesFilter, setInquiriesFilter] = useState('')

  // Edit requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editRequests, setEditRequests] = useState<any[]>([])
  const [editRequestsLoading, setEditRequestsLoading] = useState(false)
  const [editRequestsFilter, setEditRequestsFilter] = useState('')

  // Add requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addRequests, setAddRequests] = useState<any[]>([])
  const [addRequestsLoading, setAddRequestsLoading] = useState(false)
  const [addRequestsFilter, setAddRequestsFilter] = useState('')

  const [verifyRequests, setVerifyRequests] = useState<any[]>([])
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyFilter, setVerifyFilter] = useState('')

  // Community
  const [communityStats, setCommunityStats] = useState<{ totalPosts: number; totalComments: number; todayPosts: number; todayComments: number; hiddenPosts: number; pinnedPosts: number } | null>(null)
  const [communitySettings, setCommunitySettings] = useState<{ pointsPerPost: number; pointsPerComment: number; dailyMaxPostPoints: number; dailyMaxCommentPoints: number }>({ pointsPerPost: 5, pointsPerComment: 1, dailyMaxPostPoints: 0, dailyMaxCommentPoints: 0 })
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<any[]>([])
  const [communityPostsTotal, setCommunityPostsTotal] = useState(0)
  const [communityPostsPage, setCommunityPostsPage] = useState(1)
  const [communityPostsSearch, setCommunityPostsSearch] = useState('')
  const [communityPostsType, setCommunityPostsType] = useState('')
  const [communityPostsHidden, setCommunityPostsHidden] = useState('')
  const [communityPostsLoading, setCommunityPostsLoading] = useState(false)
  const [communitySettingsSaving, setCommunitySettingsSaving] = useState(false)
  const [communitySettingsSaved, setCommunitySettingsSaved] = useState(false)
  const [communitySubTab, setCommunitySubTab] = useState<'overview' | 'posts' | 'settings'>('overview')

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

  // URL 파라미터로 탭/카테고리 초기화
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab') as Tab | null
    const catParam = params.get('category') as 'smartphone' | 'tablet' | 'laptop' | null
    if (tabParam && ['dashboard', 'products', 'users', 'comparisons', 'cpus', 'gpus', 'reports', 'inquiries', 'edit_requests', 'add_requests'].includes(tabParam)) {
      setTab(tabParam)
    }
    if (catParam && ['smartphone', 'tablet', 'laptop'].includes(catParam)) {
      setProductCatTab(catParam)
    }
  }, [])

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
      const json = await res.json().catch(() => ({}))
      setCpuError(json.error ?? `CPU 목록 오류 HTTP ${res.status}`)
    }
    setCpusLoading(false)
  }, [])

  const recalculateAll = async () => {
    setRecalculating(true)
    const token = (await supabase.auth.getSession()).data.session?.access_token ?? ''
    const res = await fetch('/api/admin/cpus/recalculate-all', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    })
    if (res.ok) await fetchCpus(cpuSearch)
    else setCpuError('재계산 실패')
    setRecalculating(false)
  }

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
    setNewCpuPassmarkSingle('')
    setNewCpuPassmarkMulti('')
    setNewCpuTdp('')
    setNewCpuProcessNm('')
    setNewCpuGpuId(null)
    setNewCpuLinkedGpuName('')
    setCpuGpuQuery('')
    setCpuGpuResults([])
  }

  const cpuFormBody = () => ({
    name:             newCpuName.trim(),
    brand:            newCpuBrand.trim() || null,
    type:             newCpuType,
    cores:            newCpuCores      ? Number(newCpuCores)      : null,
    clock_base:       newCpuClockBase  ? Number(newCpuClockBase)  : null,
    clock_boost:      newCpuClockBoost ? Number(newCpuClockBoost) : null,
    gpu_name:         newCpuGpuName.trim() || null,
    gb6_single:       newCpuGb6Single       ? Number(newCpuGb6Single)       : null,
    gb6_multi:        newCpuGb6Multi        ? Number(newCpuGb6Multi)        : null,
    igpu_gb6_single:  newCpuIgpuSingle      ? Number(newCpuIgpuSingle)      : null,
    tdmark_score:     newCpuTdmark          ? Number(newCpuTdmark)          : null,
    antutu_score:     newCpuAntutu          ? Number(newCpuAntutu)          : null,
    cinebench_single: newCpuCbSingle        ? Number(newCpuCbSingle)        : null,
    cinebench_multi:  newCpuCbMulti         ? Number(newCpuCbMulti)         : null,
    passmark_single:  newCpuPassmarkSingle  ? Number(newCpuPassmarkSingle)  : null,
    passmark_multi:   newCpuPassmarkMulti   ? Number(newCpuPassmarkMulti)   : null,
    tdp:              newCpuTdp             ? Number(newCpuTdp)             : null,
    process_nm:       newCpuProcessNm       ? Number(newCpuProcessNm)       : null,
    gpu_id:           newCpuGpuId || null,
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
    setNewCpuPassmarkSingle(c.passmark_single != null ? String(c.passmark_single) : '')
    setNewCpuPassmarkMulti(c.passmark_multi != null ? String(c.passmark_multi) : '')
    setNewCpuTdp(c.tdp != null ? String(c.tdp) : '')
    setNewCpuProcessNm(c.process_nm != null ? String(c.process_nm) : '')
    setNewCpuGpuId(c.gpu_id ?? null)
    setNewCpuLinkedGpuName(c.gpus?.name ?? '')
    setCpuGpuQuery('')
    setCpuGpuResults([])
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
    setNewGpuType('laptop')
    setNewGpuCores('')
    setNewGpuGb6Single('')
    setNewGpuGb6MlSingle('')
    setNewGpuGb6MlHalf('')
    setNewGpuGb6MlQuantized('')
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
      if (specs.type && (specs.type === 'laptop' || specs.type === 'desktop')) setNewGpuType(specs.type as 'laptop' | 'desktop')
      if (specs.cores != null)       setNewGpuCores(String(specs.cores))
      if (specs.gb6_single != null)  setNewGpuGb6Single(String(specs.gb6_single))
      if (specs.gb6_ml_single != null) setNewGpuGb6MlSingle(String(specs.gb6_ml_single))
      if (specs.gb6_ml_half != null)   setNewGpuGb6MlHalf(String(specs.gb6_ml_half))
      if (specs.gb6_ml_quantized != null) setNewGpuGb6MlQuantized(String(specs.gb6_ml_quantized))
    } catch (e) {
      setAiGpuError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiFillingGpu(false)
    }
  }

  const handleAddGpu = async () => {
    if (!newGpuName.trim()) return
    setAddingGpu(true)
    setGpuError(null)
    const body = {
      name:         newGpuName.trim(),
      brand:        newGpuBrand.trim() || null,
      type:         newGpuType,
      cores:            newGpuCores         ? Number(newGpuCores)         : null,
      gb6_single:       newGpuGb6Single     ? Number(newGpuGb6Single)     : null,
      gb6_ml_single:    newGpuGb6MlSingle   ? Number(newGpuGb6MlSingle)   : null,
      gb6_ml_half:      newGpuGb6MlHalf     ? Number(newGpuGb6MlHalf)     : null,
      gb6_ml_quantized: newGpuGb6MlQuantized ? Number(newGpuGb6MlQuantized) : null,
    }
    try {
      const url = editingGpuId ? `/api/admin/gpus/${editingGpuId}` : '/api/admin/gpus'
      const method = editingGpuId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setGpuError(json.error ?? `저장 실패 HTTP ${res.status}`); return }
      resetGpuForm()
      fetchGpus(gpuSearch)
    } catch (e) {
      setGpuError(e instanceof Error ? e.message : String(e))
    } finally {
      setAddingGpu(false)
    }
  }

  const handleEditGpu = (g: typeof gpus[0]) => {
    setEditingGpuId(g.id)
    setNewGpuName(g.name)
    setNewGpuBrand(g.brand ?? '')
    setNewGpuType((g.type as 'laptop' | 'desktop') ?? 'laptop')
    setNewGpuCores(g.cores != null ? String(g.cores) : '')
    setNewGpuGb6Single(g.gb6_single != null ? String(g.gb6_single) : '')
    setNewGpuGb6MlSingle(g.gb6_ml_single != null ? String(g.gb6_ml_single) : '')
    setNewGpuGb6MlHalf(g.gb6_ml_half != null ? String(g.gb6_ml_half) : '')
    setNewGpuGb6MlQuantized(g.gb6_ml_quantized != null ? String(g.gb6_ml_quantized) : '')
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

  const fetchReports = useCallback(async (statusFilter = '') => {
    if (!token) return
    setReportsLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/community/reports${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setReports(d.reports ?? []) }
    setReportsLoading(false)
  }, [token])

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'reports') fetchReports(reportsFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  const handleReportStatus = async (id: string, status: string) => {
    await fetch('/api/community/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('이 신고를 삭제하시겠습니까?')) return
    await fetch('/api/community/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const fetchInquiries = useCallback(async (statusFilter = '') => {
    if (!token) return
    setInquiriesLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/contact${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setInquiries(d.inquiries ?? []) }
    setInquiriesLoading(false)
  }, [token])

  const handleInquiryStatus = async (id: string, status: string) => {
    await fetch('/api/contact', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    setInquiries(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const fetchEditRequests = useCallback(async (statusFilter = '') => {
    if (!token) return
    setEditRequestsLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/products/edit-request${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setEditRequests(d.requests ?? []) }
    setEditRequestsLoading(false)
  }, [token])

  const handleEditRequestStatus = async (id: string, status: string) => {
    await fetch('/api/products/edit-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    setEditRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const fetchAddRequests = useCallback(async (statusFilter = '') => {
    if (!token) return
    setAddRequestsLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/products/add-request${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setAddRequests(d.requests ?? []) }
    setAddRequestsLoading(false)
  }, [token])

  const handleAddRequestStatus = async (id: string, status: string) => {
    await fetch('/api/products/add-request', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    setAddRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'inquiries') fetchInquiries(inquiriesFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'edit_requests') fetchEditRequests(editRequestsFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'add_requests') fetchAddRequests(addRequestsFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  const fetchVerifyRequests = useCallback(async (statusFilter = '') => {
    if (!token) return
    setVerifyLoading(true)
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/admin/verify-requests${qs}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setVerifyRequests(d.requests ?? []) }
    setVerifyLoading(false)
  }, [token])

  const handleVerifyAction = async (id: string, action: 'approve' | 'reject', adminNote = '') => {
    const res = await fetch('/api/admin/verify-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action, admin_note: adminNote || null }),
    })
    if (res.ok) {
      const d = await res.json()
      setVerifyRequests(prev => prev.map(r => r.id === id ? { ...r, status: d.status } : r))
    }
  }

  useEffect(() => {
    if (!authed || !token) return
    if (tab === 'verify_requests') fetchVerifyRequests(verifyFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  const fetchCommunityOverview = useCallback(async (tok: string) => {
    setCommunityLoading(true)
    const res = await fetch('/api/admin/community', { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const d = await res.json()
      setCommunityStats(d.stats)
      setCommunitySettings(d.settings)
    }
    setCommunityLoading(false)
  }, [])

  const fetchCommunityPosts = useCallback(async (tok: string, pg: number, q: string, type: string, hidden: string) => {
    setCommunityPostsLoading(true)
    const params = new URLSearchParams({ page: String(pg) })
    if (q) params.set('q', q)
    if (type) params.set('type', type)
    if (hidden) params.set('hidden', hidden)
    const res = await fetch(`/api/admin/community/posts?${params}`, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const d = await res.json()
      setCommunityPosts(d.posts ?? [])
      setCommunityPostsTotal(d.total ?? 0)
    }
    setCommunityPostsLoading(false)
  }, [])

  const handleCommunityPostAction = async (postId: string, action: string) => {
    const res = await fetch('/api/admin/community/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ post_id: postId, action }),
    })
    if (res.ok) {
      if (action === 'delete') {
        setCommunityPosts(prev => prev.filter(p => p.id !== postId))
        setCommunityPostsTotal(t => t - 1)
      } else if (action === 'hide') {
        setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, is_hidden: true } : p))
      } else if (action === 'unhide') {
        setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, is_hidden: false } : p))
      } else if (action === 'pin') {
        setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: true } : p))
      } else if (action === 'unpin') {
        setCommunityPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: false } : p))
      }
    }
  }

  const handleSaveCommunitySettings = async () => {
    setCommunitySettingsSaving(true)
    const res = await fetch('/api/admin/community', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(communitySettings),
    })
    if (res.ok) { setCommunitySettingsSaved(true); setTimeout(() => setCommunitySettingsSaved(false), 2000) }
    setCommunitySettingsSaving(false)
  }

  useEffect(() => {
    if (!authed || !token || tab !== 'community') return
    fetchCommunityOverview(token)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab])

  useEffect(() => {
    if (!authed || !token || tab !== 'community' || communitySubTab !== 'posts') return
    fetchCommunityPosts(token, communityPostsPage, communityPostsSearch, communityPostsType, communityPostsHidden)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, token, tab, communitySubTab, communityPostsPage, communityPostsType, communityPostsHidden])

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

  const handleDuplicateProduct = async (id: string, name: string) => {
    if (!confirm(`"${name}" 제품을 복사하시겠습니까? 복사본은 비공개로 생성됩니다.`)) return
    setDuplicating(id)
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (res.ok && json.id) {
      router.push(`/admin/products/${json.id}`)
    }
    setDuplicating(null)
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

  const NAV_GROUPS: { label: string | null; items: { key: Tab; label: string; icon: React.ReactNode }[] }[] = [
    {
      label: null,
      items: [{ key: 'dashboard', label: '대시보드', icon: <LayoutDashboard size={14} /> }],
    },
    {
      label: '제품',
      items: [
        { key: 'products',    label: '제품 관리', icon: <Package size={14} /> },
        { key: 'cpus',        label: 'CPU',       icon: <Cpu size={14} /> },
        { key: 'gpus',        label: 'GPU',       icon: <Monitor size={14} /> },
      ],
    },
    {
      label: '유저',
      items: [
        { key: 'users',           label: '유저 관리', icon: <Users size={14} /> },
        { key: 'comparisons',     label: '비교 이력', icon: <BarChart2 size={14} /> },
        { key: 'verify_requests', label: '인증 신청', icon: <BadgeCheck size={14} /> },
      ],
    },
    {
      label: '커뮤니티',
      items: [
        { key: 'community', label: '커뮤니티 관리', icon: <MessageSquare size={14} /> },
        { key: 'reports',   label: '신고 관리',     icon: <Flag size={14} /> },
      ],
    },
    {
      label: '지원',
      items: [
        { key: 'inquiries',     label: '문의 관리', icon: <Mail size={14} /> },
        { key: 'edit_requests', label: '수정 요청', icon: <Pencil size={14} /> },
        { key: 'add_requests',  label: '등록 요청', icon: <PlusCircle size={14} /> },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <svg viewBox="0 0 1334.13 282.17" className="h-3.5 w-auto" fill="white" xmlns="http://www.w3.org/2000/svg" aria-label="pickvolt">
              <path d="M187.05,57.78c-7.39-13.39-18.12-23.89-32.18-31.49c-14.06-7.6-31.12-11.39-51.19-11.37L0.78,15.03l0.28,263.88l54.02-0.06l-0.09-86.25l47.64-0.05c20.31-0.02,37.57-3.79,51.79-11.3c14.22-7.51,25.07-17.91,32.55-31.2c7.48-13.29,11.22-28.67,11.2-46.15C198.15,86.55,194.44,71.18,187.05,57.78z M137.18,127.35c-3.48,6.73-8.78,12.02-15.92,15.87c-7.14,3.85-16.26,5.77-27.36,5.78l-38.96,0.04l-0.09-89.44l38.79-0.04c11.1-0.01,20.25,1.84,27.46,5.55c7.2,3.71,12.55,8.9,16.04,15.57c3.49,6.67,5.24,14.43,5.25,23.28C142.39,112.82,140.65,120.62,137.18,127.35z"/>
              <path d="M252.1,54.79c-8.03,0.01-14.88-2.64-20.55-7.95c-5.67-5.31-8.51-11.74-8.52-19.3c-0.01-7.55,2.82-13.99,8.48-19.31s12.5-7.98,20.54-7.99c8.03-0.01,14.91,2.64,20.64,7.95c5.73,5.31,8.6,11.74,8.61,19.3c0.01,7.56-2.85,13.99-8.57,19.31C267,52.12,260.13,54.79,252.1,54.79z M225.77,278.68l-0.21-198l53.13-0.06l0.21,198L225.77,278.68z"/>
              <path d="M403.55,282.39c-19.95,0.02-37.17-4.24-51.64-12.79c-14.47-8.54-25.64-20.46-33.51-35.74c-7.87-15.28-11.81-33.08-11.83-53.38c-0.02-20.54,3.88-38.46,11.72-53.76c7.83-15.3,18.98-27.23,33.44-35.81c14.45-8.57,31.66-12.87,51.61-12.89c11.69-0.01,22.49,1.51,32.42,4.57c9.92,3.06,18.72,7.42,26.4,13.08c7.68,5.66,14,12.56,18.97,20.7c4.97,8.14,8.4,17.29,10.3,27.44l-49.4,9.26c-1.07-5.19-2.73-9.83-4.97-13.9c-2.25-4.07-4.97-7.55-8.16-10.44c-3.19-2.89-6.88-5.1-11.08-6.63c-4.19-1.53-8.83-2.29-13.9-2.29c-9.45,0.01-17.38,2.56-23.81,7.64c-6.43,5.08-11.26,12.17-14.5,21.27c-3.24,9.1-4.85,19.61-4.84,31.53c0.01,11.69,1.65,22.08,4.9,31.17c3.26,9.09,8.1,16.23,14.54,21.41c6.44,5.19,14.38,7.78,23.83,7.77c5.07,0,9.74-0.81,13.99-2.41c4.25-1.6,8.02-3.91,11.33-6.92c3.3-3.01,6.07-6.65,8.31-10.9c2.24-4.25,3.83-9.04,4.77-14.35l49.42,8.98c-1.88,10.51-5.29,19.87-10.24,28.08c-4.95,8.21-11.26,15.27-18.93,21.18c-7.67,5.91-16.49,10.41-26.46,13.49C426.24,280.83,415.35,282.38,403.55,282.39z"/>
              <polygon points="642.95,278.25 705.47,278.18 627.6,166.25 701.54,80.18 640.09,80.25 575.35,156.47 572.33,156.47 572.19,14.44 519.06,14.49 519.33,278.38 572.46,278.32 572.4,214.82 587.57,197.67"/>
              <path d="M853.99,80.02l-32.83,102.75c-4,12.88-7.47,25.87-10.41,38.97c-1.14,5.07-2.29,10.24-3.44,15.45c-1.2-5.21-2.39-10.37-3.56-15.44c-3.02-13.1-6.55-26.09-10.58-38.95l-33.4-102.69l-56.5,0.06l73.17,197.93l60.39-0.06l72.94-198.08L853.99,80.02z"/>
              <path d="M1010.55,281.76c-19.83,0.02-37.02-4.24-51.55-12.79c-14.53-8.54-25.73-20.46-33.6-35.74c-7.87-15.28-11.81-33.08-11.83-53.38c-0.02-20.54,3.88-38.46,11.72-53.76c7.83-15.3,19.01-27.23,33.52-35.81c14.51-8.57,31.69-12.87,51.52-12.89c19.95-0.02,37.17,4.24,51.64,12.79c14.47,8.55,25.64,20.46,33.51,35.74c7.87,15.28,11.81,33.19,11.83,53.74c0.02,20.31-3.89,38.11-11.72,53.41c-7.84,15.3-18.98,27.24-33.44,35.81C1047.71,277.44,1030.5,281.74,1010.55,281.76z M1010.51,239.96c9.45-0.01,17.35-2.64,23.72-7.91c6.37-5.26,11.14-12.47,14.32-21.62c3.18-9.15,4.76-19.46,4.75-30.91c-0.01-11.69-1.62-22.08-4.81-31.17c-3.2-9.09-7.99-16.22-14.37-21.41c-6.38-5.19-14.29-7.78-23.74-7.77c-9.45,0.01-17.33,2.62-23.63,7.82c-6.31,5.2-11.06,12.35-14.23,21.44c-3.18,9.1-4.76,19.49-4.75,31.18c0.01,11.45,1.62,21.75,4.81,30.9c3.2,9.15,7.96,16.35,14.28,21.59C993.18,237.35,1001.06,239.97,1010.51,239.96z"/>
              <path d="M1188.22,13.79l0.28,263.88l-53.13,0.05l-0.28-263.88L1188.22,13.79z"/>
              <path d="M1326.03,235.74c-1.89,0.48-4.66,0.98-8.32,1.51c-3.66,0.54-6.49,0.8-8.5,0.81c-6.5,0.01-11.13-1.49-13.91-4.5c-2.78-3.01-4.17-7.64-4.18-13.9l-0.1-99.53l37.01-0.04l-0.04-40.56l-37.02,0.04l-0.05-47.11l-53.13,0.06l0.05,47.11l-27.27,0.03l0.04,40.56l27.27-0.03l0.11,104.14c0.02,18.07,5.29,31.93,15.81,41.6c10.52,9.67,25.69,14.5,45.53,14.47c5.31-0.01,10.89-0.37,16.74-1.08c5.84-0.71,11.71-1.96,17.62-3.74L1326.03,235.74z"/>
            </svg>
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-sm text-white/60 font-medium">admin</span>
        </div>
        <Link href="/mypage" className="text-sm text-white/40 hover:text-white transition-colors">my page</Link>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <aside className="w-52 flex-shrink-0 border-r border-border overflow-y-auto bg-background/50">
          <nav className="py-4 px-2">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                {group.label && (
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 mb-1">{group.label}</p>
                )}
                {group.items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      tab === item.key
                        ? 'bg-accent/15 text-white font-semibold'
                        : 'text-white/45 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={tab === item.key ? 'text-accent' : ''}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto">
      <div className="px-8 py-8">

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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                  <StatCard icon={<Package size={18} />} label="전체 제품" value={stats.totalProducts} />
                  <StatCard icon={<Users size={18} />} label="전체 유저" value={stats.totalUsers} />
                  <StatCard icon={<BarChart2 size={18} />} label="오늘 비교" value={stats.todayComparisons} sub={`총 ${stats.totalComparisons}회`} />
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
                href={`/admin/products/new?category=${productCatTab}`}
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
                          <Link href={`/admin/products/${p.id}?category=${productCatTab}`}
                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-accent transition-colors inline-flex">
                            <Edit2 size={13} />
                          </Link>
                          <button
                            onClick={() => handleDuplicateProduct(p.id, p.name)}
                            disabled={duplicating === p.id}
                            title="복사"
                            className="p-1.5 rounded hover:bg-white/10 text-white/20 hover:text-white/60 transition-colors inline-flex disabled:opacity-40"
                          >
                            {duplicating === p.id ? <RefreshCw size={13} className="animate-spin" /> : <Copy size={13} />}
                          </button>
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
                      <th className="text-right px-4 py-3 text-white/40 font-medium">비교</th>
                      <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">글</th>
                      <th className="text-right px-4 py-3 text-white/40 font-medium hidden md:table-cell">댓글</th>
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
                        <td className="px-4 py-3 text-white/70 text-right font-mono hidden md:table-cell">{u.posts}</td>
                        <td className="px-4 py-3 text-white/70 text-right font-mono hidden md:table-cell">{u.comments}</td>
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
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-white/30">유저 없음</td></tr>
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">CPU 관리</h1>
              <button
                onClick={recalculateAll}
                disabled={recalculating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
              >
                <RefreshCw size={12} className={recalculating ? 'animate-spin' : ''} />
                {recalculating ? '재계산 중...' : '전체 점수 재계산'}
              </button>
            </div>

            {/* Add / Edit CPU form */}
            <div className="bg-surface border border-border rounded-card p-5 mb-6">
              <p className="text-sm font-semibold text-white mb-4">
                {editingCpuId ? '✏️ CPU 수정' : '새 CPU 추가'}
              </p>

              {/* 브랜드 */}
              <BrandSelector
                value={newCpuBrand}
                onChange={setNewCpuBrand}
                brands={Array.from(new Set([...CPU_BRANDS, ...cpus.map((c) => c.brand).filter((b): b is string => Boolean(b))]))}
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
                <>
                  {/* Cinebench */}
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

                  {/* Geekbench 6 */}
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
                      placeholder="GB6 Multi (예: 14000)"
                      value={newCpuGb6Multi}
                      onChange={(e) => setNewCpuGb6Multi(e.target.value)}
                      className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Passmark */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="text-xs text-white/30 w-full">Passmark</span>
                    <input
                      type="number"
                      placeholder="Passmark Single (예: 3500)"
                      value={newCpuPassmarkSingle}
                      onChange={(e) => setNewCpuPassmarkSingle(e.target.value)}
                      className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      placeholder="Passmark Multi (예: 30000)"
                      value={newCpuPassmarkMulti}
                      onChange={(e) => setNewCpuPassmarkMulti(e.target.value)}
                      className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* TDP */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="text-xs text-white/30 w-full">TDP</span>
                    <input
                      type="number"
                      placeholder="TDP (W, 예: 45)"
                      value={newCpuTdp}
                      onChange={(e) => setNewCpuTdp(e.target.value)}
                      className="w-36 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* 공정 (선택) */}
                  <div className="mb-4">
                    <span className="text-xs text-white/30 block mb-2">공정 (선택)</span>
                    <div className="flex flex-wrap gap-2">
                      {[3, 4, 5, 6, 7, 10, 12, 14].map((nm) => (
                        <button
                          key={nm}
                          type="button"
                          onClick={() => setNewCpuProcessNm(newCpuProcessNm === String(nm) ? '' : String(nm))}
                          className={`text-xs px-3 py-1 rounded-full border transition-all ${
                            newCpuProcessNm === String(nm)
                              ? 'border-accent text-accent bg-accent/10'
                              : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {nm}nm
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* GPU 연동 (선택) */}
                  <div className="mb-4">
                    <span className="text-xs text-white/30 block mb-2">GPU 연동 (선택)</span>
                    {newCpuGpuId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-accent">{newCpuLinkedGpuName}</span>
                        <button
                          type="button"
                          onClick={() => { setNewCpuGpuId(null); setNewCpuLinkedGpuName(''); setCpuGpuQuery(''); setCpuGpuResults([]) }}
                          className="text-xs text-white/30 hover:text-red-400 transition-colors"
                        >
                          ✕ 해제
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="GPU 이름으로 검색..."
                          value={cpuGpuQuery}
                          onChange={async (e) => {
                            setCpuGpuQuery(e.target.value)
                            if (e.target.value.length < 2) { setCpuGpuResults([]); return }
                            const res = await fetch(`/api/admin/gpus?q=${encodeURIComponent(e.target.value)}`)
                            const j = await res.json()
                            setCpuGpuResults(j.gpus ?? [])
                          }}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                        />
                        {cpuGpuResults.length > 0 && (
                          <div className="absolute top-full mt-1 w-full bg-surface-2 border border-border rounded-lg overflow-hidden z-10 shadow-xl">
                            {cpuGpuResults.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => { setNewCpuGpuId(g.id); setNewCpuLinkedGpuName(g.name); setCpuGpuQuery(''); setCpuGpuResults([]) }}
                                className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
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

            <div className="bg-surface border border-border rounded-card overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-white/40 font-medium whitespace-nowrap">이름</th>
                    <th className="text-left px-4 py-3 text-white/40 font-medium">브랜드</th>
                    {cpuTypeTab === 'mobile' ? (
                      <>
                        <th className="text-right px-4 py-3 text-white/40 font-medium whitespace-nowrap">GB6 Single</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium whitespace-nowrap">GB6 Multi</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium whitespace-nowrap">3DMark</th>
                        <th className="text-right px-4 py-3 text-white/40 font-medium whitespace-nowrap">AnTuTu</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">CB Single</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">CB Multi</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">GB6 Single</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">GB6 Multi</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">PM Single</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">PM Multi</th>
                        <th className="text-right px-3 py-3 text-white/40 font-medium whitespace-nowrap text-xs">TDP</th>
                      </>
                    )}
                    <th className="text-right px-4 py-3 text-white/40 font-medium whitespace-nowrap">상대점수</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {cpusLoading && cpus.length === 0 ? (
                    <tr><td colSpan={12} className="px-4 py-8 text-center">
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
                      <td className="px-4 py-3">
                        {c.brand && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{c.brand}</span>}
                      </td>
                      {cpuTypeTab === 'mobile' ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs">{c.gb6_single ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs">{c.gb6_multi ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs">{c.tdmark_score ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-mono text-white/50 text-xs">
                            {c.antutu_score != null ? c.antutu_score.toLocaleString() : '—'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.cinebench_single != null ? <span className="text-white/60">{c.cinebench_single.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.cinebench_multi != null ? <span className="text-white/60">{c.cinebench_multi.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.gb6_single != null ? <span className="text-white/60">{c.gb6_single.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.gb6_multi != null ? <span className="text-white/60">{c.gb6_multi.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.passmark_single != null ? <span className="text-white/60">{c.passmark_single.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.passmark_multi != null ? <span className="text-white/60">{c.passmark_multi.toLocaleString()}</span> : <span className="text-white/20">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                            {c.tdp != null ? <span className="text-blue-400/70">{c.tdp}W</span> : <span className="text-white/20">—</span>}
                          </td>
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
            <p className="text-xs text-white/20 mt-3">검색어를 입력하면 실시간으로 필터됩니다.</p>
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

              <BrandSelector value={newGpuBrand} onChange={setNewGpuBrand} brands={Array.from(new Set([...GPU_BRANDS, ...gpus.map((g) => g.brand).filter((b): b is string => Boolean(b))]))} />

              {/* 타입 */}
              <div className="flex gap-2 mb-4">
                {(['laptop', 'desktop'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setNewGpuType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newGpuType === t ? 'bg-accent text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                    {t === 'laptop' ? '랩탑' : '데스크탑'}
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

              {/* 벤치마크 */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs text-white/30 w-full">Geekbench GPU</span>
                <input
                  type="number"
                  placeholder="GB6 Compute / Metal / OpenCL / Vulkan"
                  value={newGpuGb6Single}
                  onChange={(e) => setNewGpuGb6Single(e.target.value)}
                  className="w-56 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Geekbench ML (선택) */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="text-xs text-white/30 w-full">Geekbench ML (선택)</span>
                <input
                  type="number"
                  placeholder="ML Single Precision"
                  value={newGpuGb6MlSingle}
                  onChange={(e) => setNewGpuGb6MlSingle(e.target.value)}
                  className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="ML Half Precision"
                  value={newGpuGb6MlHalf}
                  onChange={(e) => setNewGpuGb6MlHalf(e.target.value)}
                  className="w-44 bg-background border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  placeholder="ML Quantized"
                  value={newGpuGb6MlQuantized}
                  onChange={(e) => setNewGpuGb6MlQuantized(e.target.value)}
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
                    <th className="text-right px-4 py-3 text-white/40 font-medium hidden lg:table-cell">ML Single</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium hidden lg:table-cell">ML Half</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium hidden lg:table-cell">ML Quantized</th>
                    <th className="text-right px-4 py-3 text-white/40 font-medium">상대점수</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {gpusLoading && gpus.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center">
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
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.type === 'laptop' ? 'bg-purple-500/20 text-purple-300' : 'bg-orange-500/20 text-orange-300'}`}>
                            {g.type === 'laptop' ? '랩탑' : '데스크탑'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden md:table-cell">{g.gb6_single ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden lg:table-cell">{g.gb6_ml_single ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden lg:table-cell">{g.gb6_ml_half ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-white/50 text-xs hidden lg:table-cell">{g.gb6_ml_quantized ?? '—'}</td>
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
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-white/30">GPU 없음</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/20 mt-3">검색어를 입력하면 실시간으로 필터됩니다.</p>
          </div>
        )}

        {tab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">신고 관리</h1>
              <div className="flex gap-2">
                {(['', 'pending', 'reviewed', 'dismissed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setReportsFilter(s); fetchReports(s) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      reportsFilter === s
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {s === '' ? '전체' : s === 'pending' ? '대기' : s === 'reviewed' ? '검토완료' : '무시'}
                  </button>
                ))}
              </div>
            </div>

            {reportsLoading ? (
              <div className="text-white/40 py-12 text-center">로딩 중...</div>
            ) : reports.length === 0 ? (
              <div className="text-white/40 py-12 text-center">신고 없음</div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            r.status === 'pending' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            r.status === 'reviewed' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                            'border-white/20 text-white/40 bg-white/5'
                          }`}>
                            {r.status === 'pending' ? '대기' : r.status === 'reviewed' ? '검토완료' : '무시'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-white/40">
                            {r.target_type === 'post' ? '게시물' : '댓글'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-border">
                            {r.reason}
                          </span>
                          <span className="text-xs text-white/30">{formatDate(r.created_at)}</span>
                        </div>

                        {/* 신고 대상 내용 */}
                        {r.target_type === 'post' && r.post && (
                          <a href={`/community/posts/${r.target_id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-2 bg-background border border-border/50 rounded-lg px-3 py-2 mb-2 hover:border-white/20 transition-colors group">
                            <Flag size={12} className="text-white/20 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white/80 group-hover:text-white truncate">{r.post.title}</p>
                              <p className="text-[10px] text-white/30 mt-0.5">작성자: {r.post.user_display_name} · 클릭하여 게시물 보기 →</p>
                            </div>
                          </a>
                        )}
                        {r.target_type === 'comment' && r.comment && (
                          <a href={`/community/posts/${r.comment.post_id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-2 bg-background border border-border/50 rounded-lg px-3 py-2 mb-2 hover:border-white/20 transition-colors group">
                            <MessageSquare size={12} className="text-white/20 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-white/70 line-clamp-2 group-hover:text-white">{r.comment.body}</p>
                              <p className="text-[10px] text-white/30 mt-0.5">작성자: {r.comment.user_display_name} · 게시물 보기 →</p>
                            </div>
                          </a>
                        )}

                        {r.detail && (
                          <p className="text-xs text-white/60 bg-white/4 rounded-lg px-3 py-2 border border-border/40 italic">
                            신고 내용: {r.detail}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.status !== 'reviewed' && (
                          <button
                            onClick={() => handleReportStatus(r.id, 'reviewed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            검토완료
                          </button>
                        )}
                        {r.status !== 'dismissed' && (
                          <button
                            onClick={() => handleReportStatus(r.id, 'dismissed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/40 hover:bg-white/5 transition-all"
                          >
                            무시
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <button
                            onClick={() => handleReportStatus(r.id, 'pending')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          >
                            대기로 변경
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReport(r.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INQUIRIES ── */}
        {tab === 'inquiries' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">문의 관리</h1>
              <div className="flex gap-2">
                {(['', 'pending', 'reviewed', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setInquiriesFilter(s); fetchInquiries(s) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      inquiriesFilter === s
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {s === '' ? '전체' : s === 'pending' ? '대기' : s === 'reviewed' ? '검토완료' : '종료'}
                  </button>
                ))}
              </div>
            </div>

            {inquiriesLoading ? (
              <div className="text-white/40 py-12 text-center">로딩 중...</div>
            ) : inquiries.length === 0 ? (
              <div className="text-white/40 py-12 text-center">문의 없음</div>
            ) : (
              <div className="space-y-3">
                {inquiries.map(r => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            r.status === 'pending' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            r.status === 'reviewed' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                            'border-white/20 text-white/40 bg-white/5'
                          }`}>
                            {r.status === 'pending' ? '대기' : r.status === 'reviewed' ? '검토완료' : '종료'}
                          </span>
                          <span className="text-xs text-white/30">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{r.subject}</p>
                        <p className="text-xs text-white/50 mb-2">{r.name} · {r.email}</p>
                        <p className="text-sm text-white/70 bg-background rounded-lg p-2 border border-border/50 whitespace-pre-wrap">
                          {r.body}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.status !== 'reviewed' && (
                          <button
                            onClick={() => handleInquiryStatus(r.id, 'reviewed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            검토완료
                          </button>
                        )}
                        {r.status !== 'closed' && (
                          <button
                            onClick={() => handleInquiryStatus(r.id, 'closed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/40 hover:bg-white/5 transition-all"
                          >
                            종료
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <button
                            onClick={() => handleInquiryStatus(r.id, 'pending')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          >
                            대기로 변경
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── EDIT REQUESTS ── */}
        {tab === 'edit_requests' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">제품 수정 요청</h1>
              <div className="flex gap-2">
                {(['', 'pending', 'reviewed', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setEditRequestsFilter(s); fetchEditRequests(s) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      editRequestsFilter === s
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {s === '' ? '전체' : s === 'pending' ? '대기' : s === 'reviewed' ? '검토완료' : '종료'}
                  </button>
                ))}
              </div>
            </div>

            {editRequestsLoading ? (
              <div className="text-white/40 py-12 text-center">로딩 중...</div>
            ) : editRequests.length === 0 ? (
              <div className="text-white/40 py-12 text-center">수정 요청 없음</div>
            ) : (
              <div className="space-y-3">
                {editRequests.map(r => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            r.status === 'pending' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            r.status === 'reviewed' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                            'border-white/20 text-white/40 bg-white/5'
                          }`}>
                            {r.status === 'pending' ? '대기' : r.status === 'reviewed' ? '검토완료' : '종료'}
                          </span>
                          <span className="text-xs text-white/30">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-2">제품 ID: {r.product_id}</p>
                        <div className="bg-background rounded-lg p-3 border border-border/50 space-y-1">
                          <p className="text-xs text-white/40">필드: <span className="text-white/70 font-mono">{r.field_name}</span></p>
                          <p className="text-xs text-white/40">기존값: <span className="text-white/70">{r.old_value || '—'}</span></p>
                          <p className="text-xs text-white/40">변경값: <span className="text-accent font-bold">{r.new_value}</span></p>
                          {r.reason && <p className="text-xs text-white/40">이유: <span className="text-white/70">{r.reason}</span></p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.status !== 'reviewed' && (
                          <button
                            onClick={() => handleEditRequestStatus(r.id, 'reviewed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            검토완료
                          </button>
                        )}
                        {r.status !== 'closed' && (
                          <button
                            onClick={() => handleEditRequestStatus(r.id, 'closed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/40 hover:bg-white/5 transition-all"
                          >
                            종료
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <button
                            onClick={() => handleEditRequestStatus(r.id, 'pending')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          >
                            대기로 변경
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ADD REQUESTS ── */}
        {tab === 'add_requests' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">제품 등록 요청</h1>
              <div className="flex gap-2">
                {(['', 'pending', 'reviewed', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setAddRequestsFilter(s); fetchAddRequests(s) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      addRequestsFilter === s
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {s === '' ? '전체' : s === 'pending' ? '대기' : s === 'reviewed' ? '검토완료' : '종료'}
                  </button>
                ))}
              </div>
            </div>

            {addRequestsLoading ? (
              <div className="text-white/40 py-12 text-center">로딩 중...</div>
            ) : addRequests.length === 0 ? (
              <div className="text-white/40 py-12 text-center">등록 요청 없음</div>
            ) : (
              <div className="space-y-3">
                {addRequests.map(r => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            r.status === 'pending' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            r.status === 'reviewed' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' :
                            'border-white/20 text-white/40 bg-white/5'
                          }`}>
                            {r.status === 'pending' ? '대기' : r.status === 'reviewed' ? '검토완료' : '종료'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-white/40">{r.category}</span>
                          <span className="text-xs text-white/30">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">{r.product_name}</p>
                        <p className="text-xs text-white/50 mb-2">{r.brand}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs mb-2">
                          {r.cpu && <p className="text-white/40">CPU: <span className="text-white/70">{r.cpu}</span></p>}
                          {r.gpu && <p className="text-white/40">GPU: <span className="text-white/70">{r.gpu}</span></p>}
                          {r.ram && <p className="text-white/40">RAM: <span className="text-white/70">{r.ram}</span></p>}
                          {r.storage && <p className="text-white/40">저장소: <span className="text-white/70">{r.storage}</span></p>}
                          {r.os && <p className="text-white/40">OS: <span className="text-white/70">{r.os}</span></p>}
                          {r.launch_year && <p className="text-white/40">출시년도: <span className="text-white/70">{r.launch_year}</span></p>}
                        </div>
                        {r.extra_notes && (
                          <p className="text-sm text-white/60 bg-background rounded-lg p-2 border border-border/50">
                            {r.extra_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.status !== 'reviewed' && (
                          <button
                            onClick={() => handleAddRequestStatus(r.id, 'reviewed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                          >
                            검토완료
                          </button>
                        )}
                        {r.status !== 'closed' && (
                          <button
                            onClick={() => handleAddRequestStatus(r.id, 'closed')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/40 hover:bg-white/5 transition-all"
                          >
                            종료
                          </button>
                        )}
                        {r.status !== 'pending' && (
                          <button
                            onClick={() => handleAddRequestStatus(r.id, 'pending')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all"
                          >
                            대기로 변경
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VERIFY REQUESTS ── */}
        {tab === 'verify_requests' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">인증 신청 관리</h1>
              <div className="flex gap-2">
                {(['', 'pending', 'approved', 'rejected'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setVerifyFilter(s); fetchVerifyRequests(s) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      verifyFilter === s
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {s === '' ? '전체' : s === 'pending' ? '대기' : s === 'approved' ? '승인' : '거절'}
                  </button>
                ))}
              </div>
            </div>

            {verifyLoading ? (
              <div className="text-white/40 py-12 text-center">로딩 중...</div>
            ) : verifyRequests.length === 0 ? (
              <div className="text-white/40 py-12 text-center">인증 신청 없음</div>
            ) : (
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {verifyRequests.map((r: any) => (
                  <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            r.status === 'pending'  ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                            r.status === 'approved' ? 'border-accent/50 text-accent bg-accent/10' :
                            'border-red-500/50 text-red-400 bg-red-500/10'
                          }`}>
                            {r.status === 'pending' ? '대기' : r.status === 'approved' ? '승인' : '거절'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-border text-white/40">{r.category}</span>
                          <span className="text-xs text-white/30">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <p className="text-sm font-bold text-white mb-0.5">{r.nickname}</p>
                        <p className="text-xs text-white/40 mb-1">{r.email}</p>
                        <p className="text-xs text-white/60 bg-background rounded-lg p-2 border border-border/50 mb-2 leading-relaxed">{r.reason}</p>
                        <div className="flex flex-col gap-0.5 text-xs text-white/40">
                          {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="hover:text-white/70 underline truncate">{r.website}</a>}
                          {r.social_links && <p>{r.social_links}</p>}
                        </div>
                        {r.admin_note && (
                          <p className="mt-2 text-xs text-white/50 bg-white/5 rounded-lg px-3 py-2">{r.admin_note}</p>
                        )}
                      </div>
                      {r.status === 'pending' && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleVerifyAction(r.id, 'approve')}
                            className="text-xs px-3 py-1.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 transition-all"
                          >
                            인증 승인
                          </button>
                          <button
                            onClick={() => {
                              const note = window.prompt('거절 사유 (선택)')
                              handleVerifyAction(r.id, 'reject', note ?? '')
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMMUNITY ── */}
        {tab === 'community' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black">커뮤니티 관리</h1>
              <button onClick={() => fetchCommunityOverview(token)}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white border border-border hover:border-white/20 rounded-lg px-3 py-1.5 transition-all">
                <RefreshCw size={13} className={communityLoading ? 'animate-spin' : ''} /> 새로고침
              </button>
            </div>

            {/* 서브탭 */}
            <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
              {(['overview', 'posts', 'settings'] as const).map(st => (
                <button key={st} onClick={() => setCommunitySubTab(st)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    communitySubTab === st ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                  }`}>
                  {st === 'overview' ? '개요' : st === 'posts' ? '게시물 관리' : '설정'}
                </button>
              ))}
            </div>

            {/* 개요 */}
            {communitySubTab === 'overview' && (
              communityLoading && !communityStats ? (
                <div className="flex gap-1.5 py-12 justify-center">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              ) : communityStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard icon={<MessageSquare size={18} />} label="전체 게시물" value={communityStats.totalPosts} />
                    <StatCard icon={<MessageSquare size={18} />} label="전체 댓글" value={communityStats.totalComments} />
                    <StatCard icon={<BarChart2 size={18} />} label="오늘 게시물" value={communityStats.todayPosts} color="text-accent" />
                    <StatCard icon={<BarChart2 size={18} />} label="오늘 댓글" value={communityStats.todayComments} color="text-accent" />
                    <StatCard icon={<EyeOff size={18} />} label="숨김 게시물" value={communityStats.hiddenPosts} color={communityStats.hiddenPosts > 0 ? 'text-amber-400' : 'text-white'} />
                    <StatCard icon={<Pin size={18} />} label="고정 게시물" value={communityStats.pinnedPosts} />
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <p className="text-sm font-bold text-white/60 mb-3">현재 포인트 설정</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">글 작성 보상</p>
                        <p className="text-xl font-black text-accent">{communitySettings.pointsPerPost} <span className="text-xs font-normal text-white/30">pt</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">댓글 작성 보상</p>
                        <p className="text-xl font-black text-accent">{communitySettings.pointsPerComment} <span className="text-xs font-normal text-white/30">pt</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">글 일일 한도</p>
                        <p className="text-xl font-black text-white/60">{communitySettings.dailyMaxPostPoints === 0 ? '무제한' : `${communitySettings.dailyMaxPostPoints}pt`}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 mb-0.5">댓글 일일 한도</p>
                        <p className="text-xl font-black text-white/60">{communitySettings.dailyMaxCommentPoints === 0 ? '무제한' : `${communitySettings.dailyMaxCommentPoints}pt`}</p>
                      </div>
                    </div>
                    <button onClick={() => setCommunitySubTab('settings')}
                      className="mt-3 text-xs text-white/40 hover:text-white underline">
                      설정 변경 →
                    </button>
                  </div>
                </div>
              ) : null
            )}

            {/* 게시물 관리 */}
            {communitySubTab === 'posts' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2 flex-1 min-w-48">
                    <Search size={14} className="text-white/30" />
                    <input value={communityPostsSearch} onChange={e => setCommunityPostsSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setCommunityPostsPage(1); fetchCommunityPosts(token, 1, communityPostsSearch, communityPostsType, communityPostsHidden) } }}
                      placeholder="제목 검색 (Enter)..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
                  </div>
                  {(['', 'false', 'true'] as const).map(h => (
                    <button key={h} onClick={() => { setCommunityPostsHidden(h); setCommunityPostsPage(1) }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        communityPostsHidden === h ? 'border-accent text-accent bg-accent/10' : 'border-border text-white/40 hover:border-white/20 hover:text-white'
                      }`}>
                      {h === '' ? '전체' : h === 'false' ? '공개' : '숨김'}
                    </button>
                  ))}
                </div>

                {communityPostsLoading ? (
                  <div className="text-white/30 py-12 text-center text-sm">로딩 중...</div>
                ) : communityPosts.length === 0 ? (
                  <div className="text-white/30 py-12 text-center text-sm">게시물 없음</div>
                ) : (
                  <>
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-white/3">
                            <th className="px-4 py-3 text-left text-white/40 font-medium">제목</th>
                            <th className="px-3 py-3 text-left text-white/40 font-medium w-16">타입</th>
                            <th className="px-3 py-3 text-left text-white/40 font-medium w-24">작성자</th>
                            <th className="px-3 py-3 text-center text-white/40 font-medium w-12">👍</th>
                            <th className="px-3 py-3 text-center text-white/40 font-medium w-12">💬</th>
                            <th className="px-3 py-3 text-left text-white/40 font-medium w-24">날짜</th>
                            <th className="px-3 py-3 text-right text-white/40 font-medium w-28">액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {communityPosts.map((p: any) => (
                            <tr key={p.id} className={`border-b border-border/50 last:border-0 hover:bg-white/2 transition-colors ${p.is_hidden ? 'opacity-40' : ''}`}>
                              <td className="px-4 py-3 max-w-xs">
                                <div className="flex items-center gap-1.5">
                                  {p.is_pinned && <Pin size={10} className="text-accent flex-shrink-0" />}
                                  {p.is_hidden && <EyeOff size={10} className="text-white/30 flex-shrink-0" />}
                                  <a href={`/community/posts/${p.id}`} target="_blank" rel="noopener noreferrer"
                                    className="text-white/80 hover:text-white truncate">{p.title}</a>
                                </div>
                                {p.clans?.name && <span className="text-[10px] text-white/25 mt-0.5 block">c/{p.clans.name}</span>}
                              </td>
                              <td className="px-3 py-3 text-accent/70">{p.type}</td>
                              <td className="px-3 py-3 text-white/50 truncate max-w-[90px]">{p.user_display_name}</td>
                              <td className="px-3 py-3 text-center text-white/50">{p.upvotes}</td>
                              <td className="px-3 py-3 text-center text-white/50">{p.comment_count}</td>
                              <td className="px-3 py-3 text-white/30">{formatDate(p.created_at)}</td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleCommunityPostAction(p.id, p.is_pinned ? 'unpin' : 'pin')}
                                    title={p.is_pinned ? '고정 해제' : '상단 고정'}
                                    className={`p-1.5 rounded-lg border transition-all ${p.is_pinned ? 'border-accent/40 text-accent hover:bg-accent/10' : 'border-border text-white/30 hover:text-white hover:border-white/20'}`}>
                                    {p.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                                  </button>
                                  <button onClick={() => handleCommunityPostAction(p.id, p.is_hidden ? 'unhide' : 'hide')}
                                    title={p.is_hidden ? '공개' : '숨기기'}
                                    className="p-1.5 rounded-lg border border-border text-white/30 hover:text-white hover:border-white/20 transition-all">
                                    {p.is_hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                                  </button>
                                  <button onClick={() => { if (confirm('이 게시물을 삭제하시겠습니까?')) handleCommunityPostAction(p.id, 'delete') }}
                                    title="삭제" className="p-1.5 rounded-lg border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/50 transition-all">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <p className="text-xs text-white/30">총 {communityPostsTotal}개</p>
                      <div className="flex gap-2">
                        <button disabled={communityPostsPage <= 1}
                          onClick={() => setCommunityPostsPage(p => p - 1)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all">
                          이전
                        </button>
                        <span className="text-xs text-white/40 px-2 py-1.5">{communityPostsPage} / {Math.max(1, Math.ceil(communityPostsTotal / 30))}</span>
                        <button disabled={communityPostsPage >= Math.ceil(communityPostsTotal / 30)}
                          onClick={() => setCommunityPostsPage(p => p + 1)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border text-white/40 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all">
                          다음
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 설정 */}
            {communitySubTab === 'settings' && (
              <div className="max-w-lg space-y-6">
                <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins size={16} className="text-accent" />
                    <p className="text-sm font-bold text-white">포인트 적립 설정</p>
                  </div>
                  <p className="text-xs text-white/35 -mt-3">글 또는 댓글 작성 시 지급되는 포인트와 하루 최대 적립 한도를 설정합니다. 0 = 지급 안함 / 한도 없음.</p>

                  {/* 글 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">글 작성</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">작성 보상</label>
                        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                          <input type="text" inputMode="numeric"
                            value={communitySettings.pointsPerPost}
                            onChange={e => {
                              const v = parseInt(e.target.value.replace(/\D/g,'')) || 0
                              setCommunitySettings(s => ({ ...s, pointsPerPost: Math.min(9999, v) }))
                            }}
                            className="flex-1 bg-transparent text-sm text-white outline-none min-w-0" />
                          <span className="text-xs text-white/30 flex-shrink-0">pt / 글</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">일일 최대 (0=무제한)</label>
                        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                          <input type="text" inputMode="numeric"
                            value={communitySettings.dailyMaxPostPoints}
                            onChange={e => {
                              const v = parseInt(e.target.value.replace(/\D/g,'')) || 0
                              setCommunitySettings(s => ({ ...s, dailyMaxPostPoints: Math.min(99999, v) }))
                            }}
                            className="flex-1 bg-transparent text-sm text-white outline-none min-w-0" />
                          <span className="text-xs text-white/30 flex-shrink-0">pt / 일</span>
                        </div>
                      </div>
                    </div>
                    {communitySettings.pointsPerPost > 0 && communitySettings.dailyMaxPostPoints > 0 && (
                      <p className="text-[10px] text-white/30">
                        → 하루 최대 {Math.floor(communitySettings.dailyMaxPostPoints / communitySettings.pointsPerPost)}개 글까지 보상 지급
                      </p>
                    )}
                  </div>

                  {/* 댓글 */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">댓글 작성</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">작성 보상</label>
                        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                          <input type="text" inputMode="numeric"
                            value={communitySettings.pointsPerComment}
                            onChange={e => {
                              const v = parseInt(e.target.value.replace(/\D/g,'')) || 0
                              setCommunitySettings(s => ({ ...s, pointsPerComment: Math.min(9999, v) }))
                            }}
                            className="flex-1 bg-transparent text-sm text-white outline-none min-w-0" />
                          <span className="text-xs text-white/30 flex-shrink-0">pt / 댓글</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/30 block mb-1">일일 최대 (0=무제한)</label>
                        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5">
                          <input type="text" inputMode="numeric"
                            value={communitySettings.dailyMaxCommentPoints}
                            onChange={e => {
                              const v = parseInt(e.target.value.replace(/\D/g,'')) || 0
                              setCommunitySettings(s => ({ ...s, dailyMaxCommentPoints: Math.min(99999, v) }))
                            }}
                            className="flex-1 bg-transparent text-sm text-white outline-none min-w-0" />
                          <span className="text-xs text-white/30 flex-shrink-0">pt / 일</span>
                        </div>
                      </div>
                    </div>
                    {communitySettings.pointsPerComment > 0 && communitySettings.dailyMaxCommentPoints > 0 && (
                      <p className="text-[10px] text-white/30">
                        → 하루 최대 {Math.floor(communitySettings.dailyMaxCommentPoints / communitySettings.pointsPerComment)}개 댓글까지 보상 지급
                      </p>
                    )}
                  </div>

                  <button onClick={handleSaveCommunitySettings} disabled={communitySettingsSaving}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                      communitySettingsSaved
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                        : 'bg-accent hover:bg-accent/90 text-white disabled:opacity-40'
                    }`}>
                    {communitySettingsSaving ? '저장 중...' : communitySettingsSaved ? '✓ 저장됨' : '저장'}
                  </button>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings2 size={16} className="text-white/40" />
                    <p className="text-sm font-bold text-white">도배 방지 현황</p>
                  </div>
                  <p className="text-xs text-white/35 mb-4">현재 코드에 고정된 값입니다. 변경이 필요하면 <code className="bg-white/5 px-1 rounded">lib/rateLimitDb.ts</code>를 수정하세요.</p>
                  <div className="space-y-2">
                    {[
                      { label: '글쓰기 제한', value: '10분에 5개' },
                      { label: '댓글 제한', value: '5분에 10개' },
                      { label: '글 중복 방지', value: '동일 제목 30분' },
                      { label: '댓글 중복 방지', value: '동일 내용 2분' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <span className="text-xs text-white/50">{label}</span>
                        <span className="text-xs font-medium text-white/70">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
        </main>
      </div>
    </div>
  )
}
