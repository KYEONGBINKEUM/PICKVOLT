import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const maxDuration = 60

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const BASE_URL = 'https://www.pickvolt.com'

function buildEmailHtml(products: { id: string; name: string; brand: string; category: string; price_usd: number | null; image_url: string | null }[]) {
  const categoryLabel: Record<string, string> = { smartphone: 'Smartphone', laptop: 'Laptop', tablet: 'Tablet' }

  const productCards = products.map((p) => `
    <tr>
      <td style="padding: 0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616; border:1px solid #2a2a2a; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="padding: 18px 20px;">
              <p style="margin:0 0 2px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#666;">
                ${categoryLabel[p.category] ?? p.category} · ${p.brand}
              </p>
              <p style="margin:0 0 10px; font-size:16px; font-weight:800; color:#fff;">${p.name}</p>
              ${p.price_usd ? `<p style="margin:0 0 12px; font-size:13px; color:rgba(255,77,0,.9); font-weight:700;">From $${p.price_usd.toLocaleString()}</p>` : ''}
              <a href="${BASE_URL}/product/${p.id}"
                 style="display:inline-block; background:rgb(255,77,0); color:#fff; text-decoration:none; font-size:12px; font-weight:700; padding:8px 16px; border-radius:20px;">
                View specs →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pickvolt Weekly</title>
</head>
<body style="margin:0; padding:0; background:#0a0a0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:10px; height:10px; border-radius:50%; background:rgb(255,77,0); vertical-align:middle;"></td>
                  <td style="padding-left:8px; font-size:16px; font-weight:800; color:#fff; vertical-align:middle;">pickvolt</td>
                </tr>
              </table>
              <p style="margin:16px 0 4px; font-size:22px; font-weight:900; color:#fff;">This week's new releases</p>
              <p style="margin:0; font-size:13px; color:#555;">The latest products added to Pickvolt — ready to compare.</p>
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
                 style="display:inline-block; background:rgb(255,77,0); color:#fff; text-decoration:none; font-size:14px; font-weight:800; padding:14px 32px; border-radius:40px;">
                Compare them on Pickvolt →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1e1e1e; padding: 24px 0 0 0; text-align:center;">
              <p style="margin:0; font-size:11px; color:#444;">
                You're receiving this because you subscribed at <a href="${BASE_URL}" style="color:#666;">pickvolt.com</a>.<br>
                No longer interested? Simply ignore this email.
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
  // Verify Vercel Cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = makeSupabase()

  // Fetch new products from the last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: newProducts } = await supabase
    .from('products')
    .select('id, name, brand, category, price_usd, image_url')
    .eq('is_visible', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(8)

  if (!newProducts || newProducts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no new products this week' })
  }

  // Fetch all subscribers
  const { data: subscribers } = await supabase
    .from('newsletter_subscribers')
    .select('email')
    .eq('active', true)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no active subscribers' })
  }

  const resend = new Resend(resendKey)
  const html = buildEmailHtml(newProducts)
  const subject = `Pickvolt Weekly — ${newProducts.length} new ${newProducts.length === 1 ? 'product' : 'products'} to compare`

  // Send in batches of 50 (Resend batch limit)
  const emails = subscribers.map((s) => s.email)
  let sent = 0
  const batchSize = 50

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    await resend.batch.send(
      batch.map((to) => ({
        from: 'Pickvolt <weekly@pickvolt.com>',
        to,
        subject,
        html,
      }))
    )
    sent += batch.length
  }

  return NextResponse.json({ ok: true, sent, products: newProducts.length })
}
