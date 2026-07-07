import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'
import { ARTICLE_CATEGORIES } from '@/lib/articleCategories'

const CATEGORIES: readonly string[] = ARTICLE_CATEGORIES
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function makeServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function makeSlug(title: string): string {
  const base = slugify(title)
  const suffix = Math.random().toString(36).slice(2, 8)
  return base ? `${base}-${suffix}` : `article-${suffix}`
}

// POST /api/articles/auto-import — 로컬 자동 글쓰기 스크립트 전용 (관리자 세션 없이 공유 시크릿으로 인증)
// 항상 draft로만 저장한다. 발행은 반드시 관리자가 /articles/write에서 검토 후 직접 진행한다.
export async function POST(req: NextRequest) {
  const secret = process.env.ARTICLES_IMPORT_SECRET ?? ''
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const title = (body.title ?? '').trim()
  const category = (body.category ?? '').trim()
  const authorId = (body.author_id ?? '').trim()

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  if (!UUID_RE.test(authorId)) return NextResponse.json({ error: 'invalid author_id' }, { status: 400 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('articles')
    .insert({
      author_id: authorId,
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

// PATCH /api/articles/auto-import — 저장 직후 2차 윤문 결과 반영 (draft 상태 유지)
export async function PATCH(req: NextRequest) {
  const secret = process.env.ARTICLES_IMPORT_SECRET ?? ''
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const id = (body.id ?? '').trim()
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const update: Record<string, string> = {}
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim()
  if (typeof body.content_html === 'string' && body.content_html.trim()) update.content_html = body.content_html
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', id)
    .eq('status', 'draft')
    .select('id, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
