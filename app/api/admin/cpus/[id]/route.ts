import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CPU_FIELDS = 'id, name, brand, type, cores, clock_base, clock_boost, gpu_name, gb6_single, gb6_multi, igpu_gb6_single, tdmark_score, antutu_score, cinebench_single, cinebench_multi, relative_score, score_source'

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

  const allowed = ['name', 'brand', 'type', 'cores', 'clock_base', 'clock_boost', 'gpu_name', 'gb6_single', 'gb6_multi', 'igpu_gb6_single', 'tdmark_score', 'antutu_score', 'cinebench_single', 'cinebench_multi', 'relative_score', 'score_source']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // gb6_multi 변경 시 relative_score 자동 재계산
  if ('gb6_multi' in updates && updates.gb6_multi != null && !('relative_score' in body)) {
    const supabaseTmp = makeServiceClient()
    const { data: maxRow } = await supabaseTmp
      .from('cpus')
      .select('gb6_multi')
      .order('gb6_multi', { ascending: false })
      .limit(1)
      .single()
    const maxScore = maxRow?.gb6_multi ?? (updates.gb6_multi as number)
    const newMulti = updates.gb6_multi as number
    updates.relative_score = Math.round((newMulti / Math.max(maxScore, newMulti)) * 1000)
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
