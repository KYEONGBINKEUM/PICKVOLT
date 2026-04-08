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

// POST: 새 제품 생성
export async function POST(req: NextRequest) {
  const ok = await verifyAdmin(req)
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const name = (body.name ?? '').trim()
  const brand = (body.brand ?? '').trim()
  const category = (body.category ?? '').trim()

  if (!name || !brand || !category) {
    return NextResponse.json({ error: 'name, brand, category are required' }, { status: 400 })
  }

  const supabase = makeServiceClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      brand,
      category,
      scrape_status: 'pending',
      is_visible: false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
