import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getEmailStrings } from '@/lib/emailI18n'

export const maxDuration = 60

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const BASE_URL = 'https://www.pickvolt.com'

interface HotProduct {
  id: string
  name: string
  brand: string
  category: string
  price_usd: number | null
  image_url: string | null
  compare_count: number
}

function emailImgUrl(url: string | null | undefined, width: number): string {
  if (!url) return ''
  if (!url.includes('/storage/v1/object/public/')) return url
  return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=80&resize=contain`
}

function buildEmailHtml(
  products: HotProduct[],
  unsubscribeUrl: string,
  locale = 'en',
) {
  const s = getEmailStrings(locale)
  const categoryLabel: Record<string, string> = {
    smartphone: 'Smartphone', laptop: 'Laptop', tablet: 'Tablet',
  }

  const productCards = products.map((p) => {
    const imgSrc = emailImgUrl(p.image_url, 160)
    return `
    <tr>
      <td style="padding: 0 0 12px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#161616; border:1px solid #2a2a2a; border-radius:12px; overflow:hidden;">
          <tr>
            ${imgSrc ? `
            <td width="88" style="padding:14px 0 14px 14px; vertical-align:middle;">
              <div style="width:80px; height:80px; background:#1e1e1e; border-radius:10px;
                          display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <img src="${imgSrc}" alt="${p.name}" width="80" height="80"
                     style="display:block; width:80px; height:80px; object-fit:contain;" />
              </div>
            </td>` : ''}
            <td style="padding: 14px 16px; vertical-align:middle;">
              <p style="margin:0 0 2px; font-size:10px; font-weight:700; text-transform:uppercase;
                         letter-spacing:.08em; color:#666;">
                ${categoryLabel[p.category] ?? p.category} · ${p.brand}
              </p>
              <p style="margin:0 0 6px; font-size:15px; font-weight:800; color:#fff; line-height:1.3;">${p.name}</p>
              <p style="margin:0 0 12px; font-size:12px; color:#555;">
                <span style="color:rgba(255,77,0,.85); font-weight:700;">${s.comparedTimes(p.compare_count)}</span>
                ${p.price_usd ? ` &nbsp;·&nbsp; <span style="color:#888;">${s.from} $${p.price_usd.toLocaleString()}</span>` : ''}
              </p>
              <a href="${BASE_URL}/product/${p.id}"
                 style="display:inline-block; background:rgb(255,77,0); color:#fff; text-decoration:none;
                        font-size:12px; font-weight:700; padding:7px 14px; border-radius:20px;">
                ${s.viewSpec}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="${locale}">
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

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <a href="${BASE_URL}" style="display:inline-block; text-decoration:none;">
                <img src="${BASE_URL}/logo.svg" alt="pickvolt" width="120" height="auto"
                     style="display:block; width:120px; height:auto;" />
              </a>
              <p style="margin:20px 0 4px; font-size:22px; font-weight:900; color:#fff;">
                ${s.header}
              </p>
              <p style="margin:0; font-size:13px; color:#555;">
                ${s.subheader}
              </p>
            </td>
          </tr>

          <!-- Products -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${productCards}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 16px 0 40px 0; text-align:center;">
              <a href="${BASE_URL}/compare"
                 style="display:inline-block; background:rgb(255,77,0); color:#fff;
                        text-decoration:none; font-size:14px; font-weight:800;
                        padding:14px 32px; border-radius:40px;">
                ${s.compareCta}
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1e1e1e; padding: 24px 0 0 0; text-align:center;">
              <p style="margin:0; font-size:11px; color:#444; line-height:1.8;">
                ${s.footerSub}<br>
                <a href="${unsubscribeUrl}" style="color:#555;">${s.unsubscribe}</a>
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = makeSupabase()

  // 지난 7일간 가장 많이 비교된 제품 (comparison_history 기준)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentHistory } = await supabase
    .from('comparison_history')
    .select('products')
    .gte('created_at', since)

  if (!recentHistory || recentHistory.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no comparisons this week' })
  }

  // 제품 ID별 비교 횟수 집계
  const countMap = new Map<string, number>()
  for (const row of recentHistory) {
    for (const pid of (row.products ?? [])) {
      countMap.set(pid, (countMap.get(pid) ?? 0) + 1)
    }
  }

  // 상위 8개 제품 ID
  const topIds = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  if (topIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no products found' })
  }

  const { data: productRows } = await supabase
    .from('products')
    .select('id, name, brand, category, price_usd, image_url')
    .in('id', topIds)
    .eq('is_visible', true)

  if (!productRows || productRows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'products not found' })
  }

  // 비교 횟수 붙이기 + 정렬 유지
  const hotProducts: HotProduct[] = topIds
    .map((id) => {
      const p = productRows.find((r) => r.id === id)
      if (!p) return null
      return { ...p, compare_count: countMap.get(id) ?? 0 }
    })
    .filter(Boolean) as HotProduct[]

  // 구독자 목록 (locale 포함)
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token, locale')
    .eq('active', true)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active subscribers' })
  }

  const resend = new Resend(resendKey)
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Pickvolt <weekly@pickvolt.com>'

  let sent = 0
  const batchSize = 50

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize)
    await resend.batch.send(
      batch.map((s) => {
        const locale = s.locale ?? 'en'
        const es = getEmailStrings(locale)
        const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${s.unsubscribe_token}`
        return {
          from: fromAddress,
          to: s.email,
          subject: es.subject(hotProducts.length),
          html: buildEmailHtml(hotProducts, unsubscribeUrl, locale),
        }
      })
    )
    sent += batch.length
  }

  return NextResponse.json({ ok: true, sent, products: hotProducts.length })
}
