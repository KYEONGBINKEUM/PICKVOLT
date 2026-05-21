import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.pickvolt.com'

interface HotProduct {
  id: string
  name: string
  brand: string
  category: string
  price_usd: number | null
  image_url: string | null
  compare_count: number
}

function buildEmailHtml(products: HotProduct[], unsubscribeUrl: string) {
  const categoryLabel: Record<string, string> = {
    smartphone: 'Smartphone', laptop: 'Laptop', tablet: 'Tablet',
  }

  const productCards = products.length > 0
    ? products.map((p) => `
      <tr>
        <td style="padding: 0 0 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#161616; border:1px solid #2a2a2a; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="padding: 18px 20px;">
                <p style="margin:0 0 2px; font-size:10px; font-weight:700; text-transform:uppercase;
                           letter-spacing:.08em; color:#666;">
                  ${categoryLabel[p.category] ?? p.category} · ${p.brand}
                </p>
                <p style="margin:0 0 6px; font-size:16px; font-weight:800; color:#fff;">${p.name}</p>
                <p style="margin:0 0 12px; font-size:12px; color:#555;">
                  이번 주 <span style="color:rgba(255,77,0,.85); font-weight:700;">${p.compare_count}회</span> 비교됨
                  ${p.price_usd ? ` &nbsp;·&nbsp; <span style="color:#888;">From $${p.price_usd.toLocaleString()}</span>` : ''}
                </p>
                <a href="${BASE_URL}/product/${p.id}"
                   style="display:inline-block; background:rgb(255,77,0); color:#fff; text-decoration:none;
                          font-size:12px; font-weight:700; padding:8px 16px; border-radius:20px;">
                  스펙 보기 →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('')
    : `<tr><td style="padding:20px; color:#555; font-size:13px;">이번 주 비교 데이터가 없습니다.</td></tr>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pickvolt Weekly</title>
</head>
<body style="margin:0; padding:0; background:#0a0a0a;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:10px; height:10px; border-radius:50%;
                             background:rgb(255,77,0); vertical-align:middle;"></td>
                  <td style="padding-left:8px; font-size:16px; font-weight:800;
                             color:#fff; vertical-align:middle;">pickvolt</td>
                </tr>
              </table>
              <p style="margin:16px 0 4px; font-size:22px; font-weight:900; color:#fff;">
                이번 주 가장 많이 비교된 제품
              </p>
              <p style="margin:0; font-size:13px; color:#555;">
                지난 7일간 Pickvolt에서 가장 뜨거웠던 제품들입니다.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${productCards}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0 40px 0; text-align:center;">
              <a href="${BASE_URL}/compare"
                 style="display:inline-block; background:rgb(255,77,0); color:#fff;
                        text-decoration:none; font-size:14px; font-weight:800;
                        padding:14px 32px; border-radius:40px;">
                직접 비교해보기 →
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #1e1e1e; padding: 24px 0 0 0; text-align:center;">
              <p style="margin:0; font-size:11px; color:#444; line-height:1.8;">
                <a href="${BASE_URL}" style="color:#666;">pickvolt.com</a>에서 구독하셨습니다.<br>
                <a href="${unsubscribeUrl}" style="color:#555;">구독 취소</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// POST /api/admin/newsletter/send
// body.mode:
//   'test'     → 어드민 본인에게만
//   'selected' → body.emails 배열에 있는 주소들에게만
//   'all'      → 활성 구독자 전체 (기본값)
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
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
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const mode: 'test' | 'selected' | 'all' = body.mode ?? 'all'
  const selectedEmails: string[] = body.emails ?? []

  // legacy ?test=true support
  const isTest = mode === 'test' || new URL(req.url).searchParams.get('test') === 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 지난 7일 비교 기록에서 인기 제품 추출
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentHistory } = await supabase
    .from('comparison_history')
    .select('products')
    .gte('created_at', since)

  const countMap = new Map<string, number>()
  for (const row of (recentHistory ?? [])) {
    for (const pid of (row.products ?? [])) {
      countMap.set(pid, (countMap.get(pid) ?? 0) + 1)
    }
  }

  const topIds = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  let hotProducts: HotProduct[] = []
  if (topIds.length > 0) {
    const { data: productRows } = await supabase
      .from('products')
      .select('id, name, brand, category, price_usd, image_url')
      .in('id', topIds)
      .eq('is_visible', true)

    hotProducts = topIds
      .map((id) => {
        const p = (productRows ?? []).find((r) => r.id === id)
        if (!p) return null
        return { ...p, compare_count: countMap.get(id) ?? 0 }
      })
      .filter(Boolean) as HotProduct[]
  }

  const resend = new Resend(resendKey)
  const subject = `이번 주 Pickvolt 인기 제품 Top ${hotProducts.length || '–'}${isTest ? ' [테스트]' : ''}`

  // pickvolt.com 도메인이 Resend에서 인증됐으면 weekly@pickvolt.com,
  // 아직 미인증이면 Resend 기본 주소 사용 (환경변수로 재정의 가능)
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Pickvolt <weekly@pickvolt.com>'

  // ── 테스트: 어드민 본인에게만 ──────────────────────────────────────────────
  if (isTest) {
    const adminEmail = user.email!
    const { data: sendData, error } = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject,
      html: buildEmailHtml(hotProducts, `${BASE_URL}/api/newsletter/unsubscribe?token=test`),
    })
    if (error) {
      console.error('[newsletter/send] Resend error:', error)
      return NextResponse.json({
        error: `Resend 오류: ${error.message ?? JSON.stringify(error)}`,
        detail: error,
      }, { status: 500 })
    }
    console.log('[newsletter/send] test sent:', sendData)
    return NextResponse.json({
      ok: true, sent: 1, mode: 'test', to: adminEmail,
      products: hotProducts.length,
      resend_id: (sendData as { id?: string } | null)?.id ?? null,
    })
  }

  // ── 선택 발송 ──────────────────────────────────────────────────────────────
  if (mode === 'selected') {
    if (selectedEmails.length === 0) {
      return NextResponse.json({ error: '발송할 이메일을 선택하세요.' }, { status: 400 })
    }
    const { data: rows } = await supabase
      .from('newsletter_subscribers')
      .select('email, unsubscribe_token')
      .in('email', selectedEmails)

    const tokenMap = new Map((rows ?? []).map((r: { email: string; unsubscribe_token: string }) => [r.email, r.unsubscribe_token]))

    const { data: batchData, error } = await resend.batch.send(
      selectedEmails.map((email) => ({
        from: fromAddress,
        to: email,
        subject,
        html: buildEmailHtml(hotProducts, `${BASE_URL}/api/newsletter/unsubscribe?token=${tokenMap.get(email) ?? 'na'}`),
      }))
    )
    if (error) {
      console.error('[newsletter/send] Resend batch error:', error)
      return NextResponse.json({
        error: `Resend 오류: ${error.message ?? JSON.stringify(error)}`,
        detail: error,
      }, { status: 500 })
    }
    console.log('[newsletter/send] selected sent:', batchData)
    return NextResponse.json({ ok: true, sent: selectedEmails.length, mode: 'selected', products: hotProducts.length })
  }

  // ── 전체 발송 ──────────────────────────────────────────────────────────────
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token')
    .eq('active', true)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active subscribers' })
  }

  let sent = 0
  const batchSize = 50
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)
    const { error } = await resend.batch.send(
      batch.map((s) => ({
        from: fromAddress,
        to: s.email,
        subject,
        html: buildEmailHtml(hotProducts, `${BASE_URL}/api/newsletter/unsubscribe?token=${s.unsubscribe_token}`),
      }))
    )
    if (error) {
      console.error('[newsletter/send] Resend batch error (all):', error)
      return NextResponse.json({
        error: `Resend 오류 (${sent}명 발송 후 실패): ${error.message ?? JSON.stringify(error)}`,
        detail: error,
        sent,
      }, { status: 500 })
    }
    sent += batch.length
  }

  return NextResponse.json({ ok: true, sent, mode: 'all', products: hotProducts.length })
}
