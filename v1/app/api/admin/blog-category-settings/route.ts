import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blogCategories'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const DEFAULT_VISIBLE = new Set(['mobile'])

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
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)
}

export async function GET(req: NextRequest) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = makeServiceClient()
  const { data, error } = await supabase.from('blog_category_settings').select('category, is_visible')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = new Map((data ?? []).map((r) => [r.category, r.is_visible]))
  const settings = BLOG_CATEGORY_SLUGS.map((category) => ({
    category,
    is_visible: map.has(category) ? map.get(category)! : DEFAULT_VISIBLE.has(category),
  }))

  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { category, is_visible } = await req.json()
  if (!BLOG_CATEGORY_SLUGS.includes(category) || typeof is_visible !== 'boolean') {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  const supabase = makeServiceClient()
  const { error } = await supabase
    .from('blog_category_settings')
    .upsert({ category, is_visible, updated_at: new Date().toISOString() }, { onConflict: 'category' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
