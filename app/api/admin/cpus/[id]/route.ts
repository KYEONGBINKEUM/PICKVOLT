import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recalculateCpuRelativeScores } from '@/lib/cpu-relative-score'

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

  const benchmarkFields = ['gb6_single', 'gb6_multi', 'tdmark_score', 'antutu_score', 'cinebench_single', 'cinebench_multi', 'passmark_single', 'passmark_multi']
  const hasBenchmarkChange = benchmarkFields.some((f) => f in updates)

  const supabase = makeServiceClient()

  // 1단계: 벤치마크 수치 먼저 저장 (relative_score 제외)
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

  // 2단계: 벤치마크가 바뀌었고 relative_score를 직접 지정하지 않은 경우 — 저장 후 전체 재계산
  // 순서가 중요: 새 벤치마크가 DB에 저장된 뒤 읽어야 현재 칩 값이 정확히 반영됨
  if (hasBenchmarkChange && !('relative_score' in body)) {
    const cpuType = (data?.type ?? updates.type ?? 'mobile') as string
    await recalculateCpuRelativeScores(supabase, cpuType)

    // 재계산 후 최신 데이터 반환
    const { data: fresh } = await supabase
      .from('cpus')
      .select(CPU_FIELDS)
      .eq('id', id)
      .single()
    return NextResponse.json(fresh ?? data)
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
