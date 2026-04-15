import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CPU_FIELDS = 'id, name, brand, type, cores, clock_base, clock_boost, gpu_name, gb6_single, gb6_multi, igpu_gb6_single, tdmark_score, antutu_score, cinebench_single, cinebench_multi, passmark_single, passmark_multi, tdp, process_nm, gpu_id, gpus!cpus_gpu_id_fkey(name), relative_score, score_source'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await anon.auth.getUser(token)
  if (error || !user) return false
  const email = (user.email ?? '').toLowerCase()
  return ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(email)
}

// PATCH /api/admin/cpus/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed = ['name', 'brand', 'type', 'cores', 'clock_base', 'clock_boost', 'gpu_name', 'gb6_single', 'gb6_multi', 'igpu_gb6_single', 'tdmark_score', 'antutu_score', 'cinebench_single', 'cinebench_multi', 'passmark_single', 'passmark_multi', 'tdp', 'process_nm', 'gpu_id', 'relative_score', 'score_source']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // 벤치마크 수치 변경 시 relative_score 자동 재계산 (relative_score를 직접 지정하지 않은 경우)
  const benchmarkFields = ['gb6_single', 'gb6_multi', 'tdmark_score', 'antutu_score', 'cinebench_single', 'cinebench_multi', 'passmark_single', 'passmark_multi']
  const hasBenchmarkChange = benchmarkFields.some((f) => f in updates)
  if (hasBenchmarkChange && !('relative_score' in body)) {
    const supabaseTmp = makeServiceClient()
    // 현재 저장된 값 조회 (업데이트되지 않은 필드 유지용)
    const { data: current } = await supabaseTmp
      .from('cpus')
      .select('gb6_multi, antutu_score, cinebench_multi, passmark_multi, type')
      .eq('id', id)
      .single()
    const cpuType        = (updates.type ?? current?.type) as string | null
    const gb6Multi       = (updates.gb6_multi       ?? current?.gb6_multi)       as number | null
    const antutu         = (updates.antutu_score     ?? current?.antutu_score)    as number | null
    const cinebenchMulti = (updates.cinebench_multi  ?? current?.cinebench_multi) as number | null
    const passmarkMulti  = (updates.passmark_multi   ?? current?.passmark_multi)  as number | null

    if (cpuType === 'laptop' || cpuType === 'desktop') {
      // 랩탑/데스크탑: cinebench_multi → passmark_multi → gb6_multi 순으로 기준값 선택
      const scoreForCalc = cinebenchMulti ?? passmarkMulti ?? gb6Multi
      if (scoreForCalc != null) {
        const orderBy = cinebenchMulti ? 'cinebench_multi' : (passmarkMulti ? 'passmark_multi' : 'gb6_multi')
        const { data: maxRow } = await supabaseTmp
          .from('cpus').select(orderBy).order(orderBy, { ascending: false }).limit(1).single()
        const maxVal = (maxRow as Record<string, number | null>)?.[orderBy] ?? scoreForCalc
        updates.relative_score = Math.round((scoreForCalc / Math.max(maxVal, scoreForCalc)) * 1000)
      }
    } else {
      // 모바일: gb6_multi → antutu 환산 순
      const scoreForCalc = gb6Multi ?? (antutu ? antutu / 3000 : null)
      if (scoreForCalc != null) {
        const { data: maxRow } = await supabaseTmp
          .from('cpus').select('gb6_multi, antutu_score')
          .order(gb6Multi ? 'gb6_multi' : 'antutu_score', { ascending: false }).limit(1).single()
        const maxVal = gb6Multi
          ? (maxRow?.gb6_multi ?? gb6Multi)
          : ((maxRow?.antutu_score ?? (antutu ?? 0)) / 3000)
        updates.relative_score = Math.round((scoreForCalc / Math.max(maxVal, scoreForCalc)) * 1000)
      }
    }
  }

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('cpus')
    .update(updates)
    .eq('id', id)
    .select(CPU_FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // CPU 이름 변경 시 specs_common.cpu_name 일괄 갱신
  if ('name' in updates && typeof updates.name === 'string') {
    await supabase
      .from('specs_common')
      .update({ cpu_name: updates.name })
      .eq('cpu_id', id)
  }

  return NextResponse.json(data)
}

// DELETE /api/admin/cpus/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = makeServiceClient()
  const { error } = await supabase.from('cpus').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
