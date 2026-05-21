import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

export async function GET(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const result: Record<string, unknown> = {
    resend_api_key: resendKey ? `설정됨 (${resendKey.slice(0, 8)}…)` : '❌ 미설정 — Vercel 환경변수에 RESEND_API_KEY 추가 필요',
    from_address: process.env.RESEND_FROM_EMAIL ?? 'Pickvolt <weekly@pickvolt.com> (기본값)',
    admin_email: user.email,
  }

  if (!resendKey) return NextResponse.json(result)

  // Resend API로 도메인 목록 조회
  try {
    const resend = new Resend(resendKey)
    const { data: domainsRes, error } = await resend.domains.list()
    if (error) {
      result.domains = `❌ 도메인 조회 실패: ${error.message}`
    } else {
      // ListDomainsResponseSuccess wraps the array in a .data property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: { name: string; status: string }[] = (domainsRes as any)?.data ?? domainsRes ?? []
      result.domains = list.map((d) => ({ name: d.name, status: d.status }))
    }
  } catch (e) {
    result.domains = `❌ 오류: ${String(e)}`
  }

  return NextResponse.json(result)
}
