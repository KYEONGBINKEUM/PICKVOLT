import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { collectWikidataProducts } from '@/lib/collectWikidata'

function makeService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = auth.slice(7)
  const supabase = makeService()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
  if (!adminEmails.includes(user.email.toLowerCase())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const categories = body.categories ?? ['headphones', 'monitor', 'tv', 'car']
  const results = await collectWikidataProducts(categories)
  return NextResponse.json({ results })
}
