import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES: readonly string[] = ARTICLE_CATEGORIES
const EDITABLE_FIELDS = ['title', 'summary', 'content_html', 'category', 'tags', 'thumbnail_url', 'author_name']

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const { data: { user }, error } = await makeAnonClient().auth.getUser(token)
  if (error || !user) return false
  const email = (user.email ?? '').toLowerCase()
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)
}

function estimateReadMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ')
  const chars = text.replace(/\s/g, '').length
  return Math.max(1, Math.round(chars / 500)) // 한국어 기준 분당 약 500자
}

// GET /api/articles/[slug] — 공개(public/unlisted). 관리자 토큰이면 draft도 조회 가능(편집용)
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const isAdmin = await verifyAdmin(req)
  const supabase = makeServiceClient()

  let query = supabase.from('articles').select('*').eq('slug', slug)
  if (!isAdmin) query = query.in('status', ['public', 'unlisted'])

  const { data, error } = await query.single()
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(data)
}

// DELETE /api/articles/[slug] — 관리자 전용 삭제
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { error } = await supabase.from('articles').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/articles/[slug] — 관리자 전용 수정(임시저장 포함)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  if ('category' in body && !CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of EDITABLE_FIELDS) if (k in body) updates[k] = body[k]
  if ('content_html' in body) updates.read_minutes = estimateReadMinutes(body.content_html ?? '')

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('slug', slug)
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
