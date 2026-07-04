import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeService() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
function makeAnon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// POST /api/user/verify-email — send OTP to work email
export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10분

  const supabase = makeService()

  // 기존 OTP 삭제 후 새로 삽입
  await supabase.from('verify_email_otps').delete().eq('user_id', user.id)
  const { error: insertErr } = await supabase.from('verify_email_otps').insert({
    user_id: user.id,
    email: email.trim().toLowerCase(),
    code,
    expires_at: expiresAt,
  })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Resend로 이메일 발송
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'email service not configured' }, { status: 500 })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Pickvolt <noreply@pickvolt.com>',
      to: email.trim(),
      subject: `[Pickvolt] Verification Code: ${code}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="margin-bottom:8px;">Pickvolt Badge Verification</h2>
          <p style="color:#666;margin-bottom:24px;">Your verification code is:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#FF4D00;margin-bottom:24px;">${code}</div>
          <p style="color:#999;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.json()
    return NextResponse.json({ error: err.message ?? 'email send failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/user/verify-email — confirm OTP
export async function PATCH(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { data: { user } } = await makeAnon().auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { email, code } = await req.json()
  if (!email || !code) return NextResponse.json({ error: 'email and code required' }, { status: 400 })

  const supabase = makeService()
  const { data: otp } = await supabase
    .from('verify_email_otps')
    .select('code, expires_at, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !otp ||
    otp.code !== code ||
    otp.email !== email.trim().toLowerCase() ||
    new Date(otp.expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  // 사용된 OTP 삭제
  await supabase.from('verify_email_otps').delete().eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
