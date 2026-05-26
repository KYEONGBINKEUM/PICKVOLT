import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function getAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())) return null
  return user
}

// GET /api/admin/verify-requests?status=pending
export async function GET(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') ?? ''
  const supabase = makeService()

  let query = supabase
    .from('verify_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // id_image_url에 대해 signed URL 생성 (버킷 공개 여부 무관하게 어드민이 볼 수 있도록)
  const requests = await Promise.all((data ?? []).map(async (r: { id_image_url: string | null; [key: string]: unknown }) => {
    if (!r.id_image_url) return r
    try {
      const path = r.id_image_url.split('/verify-docs/')[1]?.split('?')[0]
      if (!path) return r
      const { data: signed } = await supabase.storage
        .from('verify-docs')
        .createSignedUrl(path, 60 * 60) // 1시간 유효
      return { ...r, id_image_url: signed?.signedUrl ?? r.id_image_url }
    } catch {
      return r
    }
  }))

  return NextResponse.json({ requests })
}

// PATCH /api/admin/verify-requests — approve or reject
export async function PATCH(req: NextRequest) {
  if (!await getAdmin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id, action, admin_note } = await req.json()
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  const supabase = makeService()

  // Get the request to find user_id
  const { data: vr } = await supabase
    .from('verify_requests')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!vr) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  const [updateReq] = await Promise.all([
    supabase.from('verify_requests').update({
      status: newStatus,
      admin_note: admin_note ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id),
    action === 'approve'
      ? supabase.from('profiles').update({ is_official: true }).eq('user_id', vr.user_id)
      : Promise.resolve(),
  ])

  if (updateReq.error) return NextResponse.json({ error: updateReq.error.message }, { status: 500 })
  return NextResponse.json({ success: true, status: newStatus })
}
