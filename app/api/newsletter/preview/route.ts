import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 개발/테스트용 — 이메일 HTML을 브라우저에서 바로 확인
// 접근: /api/newsletter/preview

const BASE_URL = 'https://www.pickvolt.com'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 최근 비교 기록에서 인기 제품 추출
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

  const { data: productRows } = topIds.length > 0
    ? await supabase.from('products').select('id, name, brand, category, price_usd, image_url').in('id', topIds).eq('is_visible', true)
    : { data: [] }

  const hotProducts = (topIds.map(id => {
    const p = (productRows ?? []).find(r => r.id === id)
    if (!p) return null
    return { ...p, compare_count: countMap.get(id) ?? 0 }
  }).filter(Boolean)) as { id: string; name: string; brand: string; category: string; price_usd: number | null; image_url: string | null; compare_count: number }[]

  const categoryLabel: Record<string, string> = {
    smartphone: 'Smartphone', laptop: 'Laptop', tablet: 'Tablet',
  }

  const productCards = hotProducts.length > 0
    ? hotProducts.map((p) => `
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

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pickvolt Weekly — Preview</title>
</head>
<body style="margin:0; padding:0; background:#0a0a0a;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 32px 0;">
              <a href="${BASE_URL}" style="display:inline-block; text-decoration:none;">
                <img src="${BASE_URL}/logo.svg" alt="pickvolt" width="120" height="auto"
                     style="display:block; width:120px; height:auto;" />
              </a>
              <p style="margin:20px 0 4px; font-size:22px; font-weight:900; color:#fff;">
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
                <a href="#" style="color:#555;">구독 취소</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
