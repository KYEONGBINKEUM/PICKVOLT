import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

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

// GET /api/admin/cpus?q=snapdragon  →  이름 검색, 최대 10개
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const supabase = makeServiceClient()

  const { data, error } = await supabase
    .from('cpus')
    .select('id, name, gb6_single, gb6_multi, igpu_gb6_single, relative_score, score_source')
    .ilike('name', `%${q}%`)
    .order('relative_score', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cpus: data ?? [] })
}

// POST /api/admin/cpus  →  새 CPU 레코드 생성 후 id 반환
export async function POST(req: NextRequest) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const supabase = makeServiceClient()

  // 동일 이름(대소문자 무시) 중복 방지
  const { data: existing } = await supabase
    .from('cpus')
    .select('id, name, gb6_single, gb6_multi, igpu_gb6_single, relative_score, score_source')
    .ilike('name', name)
    .limit(1)
    .single()

  if (existing) return NextResponse.json({ ...existing, duplicate: true })

  const { data, error } = await supabase
    .from('cpus')
    .insert({
      name,
      gb6_single:      body.gb6_single      ?? null,
      gb6_multi:       body.gb6_multi       ?? null,
      igpu_gb6_single: body.igpu_gb6_single ?? null,
      score_source:    body.score_source    ?? 'geekbench6',
    })
    .select('id, name, gb6_single, gb6_multi, igpu_gb6_single, relative_score, score_source')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
