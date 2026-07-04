import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

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

// POST /api/articles/[slug]/publish  { status: 'public' | 'unlisted' | 'draft' }
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const isAdmin = await verifyAdmin(req)
  if (!isAdmin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const status = body.status
  if (!['draft', 'unlisted', 'public'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const supabase = makeServiceClient()
  const { data: existing, error: fetchErr } = await supabase
    .from('articles')
    .select('title, content_html, category, published_at')
    .eq('slug', slug)
    .single()

  if (fetchErr || !existing) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (status !== 'draft') {
    if (!existing.title?.trim() || !existing.content_html?.trim() || !existing.category) {
      return NextResponse.json({ error: 'title, content and category are required to publish' }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status !== 'draft' && !existing.published_at) updates.published_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('slug', slug)
    .select('id, slug, status, published_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
