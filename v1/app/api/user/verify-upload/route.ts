import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const MAX_BYTES = 20 * 1024 * 1024 // 20MB
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 400 })
  }

  const EXT_MAP: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'application/pdf': 'pdf',
  }
  const ext = EXT_MAP[file.type] ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`
  const buffer = await file.arrayBuffer()

  const supabase = makeService()
  const { error: upErr } = await supabase.storage
    .from('verify-docs')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (upErr) {
    console.error('[verify-upload] storage error:', upErr.message)
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // 공개 URL 대신 서명 URL 사용 (1시간) — 신분증 등 민감 서류 보호
  const { data: signedData, error: signErr } = await supabase.storage
    .from('verify-docs')
    .createSignedUrl(path, 60 * 60)

  if (signErr || !signedData) {
    return NextResponse.json({ error: 'url_error' }, { status: 500 })
  }

  return NextResponse.json({ url: signedData.signedUrl, path })
}
