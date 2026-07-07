import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const CATEGORIES: readonly string[] = ARTICLE_CATEGORIES

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function verifyAdmin(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await makeAnonClient().auth.getUser(token)
  if (error || !user) return null
  const email = (user.email ?? '').toLowerCase()
  if (!(ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email))) return null
  return { id: user.id, email }
}

function makeSlug(title: string): string {
  const base = slugify(title)
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : `article-${suffix}`
}

// GET /api/articles?category=tech&sort=latest&page=1&limit=12
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? 'latest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '12')))

  const supabase = makeServiceClient()
  const cols = 'id, slug, title, summary, category, tags, thumbnail_url, view_count, read_minutes, published_at, author_name'

  let query = supabase.from('articles').select(cols).eq('status', 'public')
  let countQuery = supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'public')
  if (category && CATEGORIES.includes(category)) {
    query = query.eq('category', category)
    countQuery = countQuery.eq('category', category)
  }

  if (sort === 'popular' || sort === 'views') {
    query = query.order('view_count', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false })
  }

  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const [{ data, error }, { count }] = await Promise.all([query, countQuery])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json({ items: data ?? [], total: count ?? 0 })
  res.headers.set('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=30')
  return res
}

// POST /api/articles — 관리자 전용 신규 기사 생성 (기본 draft)
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const title = (body.title ?? '').trim()
  const category = (body.category ?? '').trim()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'invalid category' }, { status: 400 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('articles')
    .insert({
      author_id: admin.id,
      author_name: body.author_name?.trim() || 'Pickvolt',
      slug: makeSlug(title),
      title,
      summary: (body.summary ?? '').trim(),
      content_html: body.content_html ?? '',
      category,
      tags: Array.isArray(body.tags) ? body.tags : [],
      thumbnail_url: body.thumbnail_url || null,
      status: 'draft',
    })
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
