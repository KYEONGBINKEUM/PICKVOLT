import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!token) {
    return new Response('<h2>Invalid link.</h2>', { status: 400, headers: { 'Content-Type': 'text/html' } })
  }

  const supabase = makeSupabase()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ active: false })
    .eq('unsubscribe_token', token)

  if (error) {
    return new Response('<h2>Something went wrong. Please try again.</h2>', { status: 500, headers: { 'Content-Type': 'text/html' } })
  }

  return new Response(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — Pickvolt</title>
<style>
  body { margin: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .box { text-align: center; padding: 40px 24px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: rgb(255,77,0); display: inline-block; margin-bottom: 24px; }
  h1 { color: #fff; font-size: 22px; font-weight: 800; margin: 0 0 8px; }
  p  { color: #555; font-size: 14px; margin: 0 0 24px; }
  a  { color: rgb(255,77,0); text-decoration: none; font-size: 13px; font-weight: 600; }
</style>
</head>
<body>
  <div class="box">
    <div class="dot"></div>
    <h1>You've been unsubscribed.</h1>
    <p>You won't receive any more emails from Pickvolt.</p>
    <a href="https://www.pickvolt.com">← Back to Pickvolt</a>
  </div>
</body>
</html>`, { status: 200, headers: { 'Content-Type': 'text/html' } })
}
