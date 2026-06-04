import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  return ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
}

const CPU_PROMPT = (name: string) => `Search nanoreview.net for the CPU/SoC named "${name}" and extract its benchmark scores.

First check the rating list at https://nanoreview.net/en/soc-list/rating to find the chip, then go to its detail page. Extract values from these exact HTML patterns:

GB6 Single-Core Score:
<div class="score-bar-name">Single-Core Score</div>
<span class="score-bar-result-number">3992</span>
→ take the integer in score-bar-result-number (use as gb6_single)

GB6 Multi-Core Score:
<div class="score-bar-name">Multi-Core Score</div>
<span class="score-bar-result-number">10688</span>
→ take the integer in score-bar-result-number (use as gb6_multi)

3DMark Steel Nomad Light score:
<div class="score-bar-name">3DMark Steel Nomad Light</div>
<span class="score-bar-result-number">2487</span>
→ take the integer in score-bar-result-number (use as tdmark_score)

AnTuTu score: look for AnTuTu benchmark score on the nanoreview page (use as antutu_score)

Also extract:
- brand (e.g. Apple, Qualcomm, Samsung, MediaTek)
- type: "mobile" for smartphone SoCs, "laptop" for laptop CPUs, "desktop" for desktop CPUs

Return a single JSON object only. No markdown, no explanation, no code fences:
{"brand":"Apple","type":"mobile","gb6_single":3500,"gb6_multi":8000,"tdmark_score":2500,"antutu_score":1700000}

Now return the JSON for "${name}". Use null for any value not found.`

const GPU_PROMPT = (name: string) => `Search nanoreview.net for the GPU named "${name}" and extract its benchmark scores and specs.

First check https://nanoreview.net/en/soc-list/rating to find the GPU, then go to its detail page. Extract values from these exact HTML patterns:

Cores: <li class="mb"><strong>Cores:</strong> 6</li>  → take the integer after "Cores:"

GB6 GPU Metal/Vulkan Score:
<div class="score-bar-name">Single-Core Score</div>
<span class="score-bar-result-number">14000</span>
→ take the integer in score-bar-result-number

GB6 Compute Score (GPU / OpenCL):
<div class="score-bar-name">Compute Score (GPU)</div>
<span class="score-bar-result-number">45527</span>
→ use as gb6_opencl

Also extract:
3DMark Steel Nomad Light score:
<div class="score-bar-name">3DMark Steel Nomad Light</div>
<span class="score-bar-result-number">2487</span>
→ take the integer in score-bar-result-number (use as tdmark_score)
- Whether it is a mobile, laptop, or desktop GPU

Return a single JSON object only. No markdown, no explanation, no code fences:
{"brand":"Apple","type":"mobile","cores":5,"gb6_single":14000,"gb6_opencl":null,"tdmark_score":null}

Now return the JSON for "${name}". Use null for any value not found.`

function extractJson(text: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')
  // Find first { and last } to extract the JSON object
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(stripped.slice(start, end + 1))
}

const AMAZON_TAG = 'pickvolt-20'

const SPECS_PROMPT: Record<string, (name: string) => string> = {
  car: (name) => `Search the web for the car model "${name}" and find its full technical specifications, trim variants, and pricing.
Return a single JSON object only. No markdown, no explanation, no code fences:
{"price_usd":38900,"launch_year":2023,"generation":"Highland","production_end":null,"body_type":"sedan","drivetrain":"RWD","powertrain":"BEV","engine_cc":null,"horsepower":358,"torque_nm":493,"acceleration_0_100":5.8,"top_speed_kmh":225,"range_km":491,"battery_kwh":75.0,"fuel_efficiency_km_l":null,"seating":5,"cargo_liters":594,"length_mm":4720,"width_mm":1921,"height_mm":1441,"wheelbase_mm":2875,"curb_weight_kg":1844,"segment":"D-segment","powertrain_variants":[{"name":"Standard RWD","powertrain":"BEV","horsepower":218,"torque_nm":350,"acceleration_0_100":9.4,"range_km":491,"battery_kwh":60,"price_usd":38900},{"name":"Long Range AWD","powertrain":"BEV","horsepower":308,"torque_nm":605,"acceleration_0_100":6.7,"range_km":503,"battery_kwh":75,"price_usd":43900},{"name":"Performance AWD","powertrain":"BEV","horsepower":428,"torque_nm":700,"acceleration_0_100":5.2,"range_km":501,"battery_kwh":75,"price_usd":47900}]}
price_usd: base trim MSRP in USD, null if unavailable
launch_year: model year first introduced
generation: facelift/generation code e.g. "Highland", "F30", "E210" (null if unknown)
production_end: year ended, null if still in production
body_type: sedan/suv/hatchback/coupe/wagon/pickup/van/convertible
drivetrain: base trim drivetrain FWD/RWD/AWD/4WD
powertrain: BEV/PHEV/HEV/MHEV/ICE
powertrain_variants: array of ALL available powertrain trims with individual specs. Include every trim if multiple exist. Empty array [] if only one variant.
Use null for any value not found.
Now return the JSON for "${name}".`,

  headphones: (name) => `Search the web for the headphones or earphones named "${name}" and find its technical specifications and pricing.
Return a single JSON object only. No markdown, no explanation, no code fences:
{"price_usd":349,"form_factor":"over-ear","driver_size_mm":40,"frequency_response":"20Hz-20kHz","impedance_ohm":32,"sensitivity_db":105,"noise_canceling":true,"wireless":true,"bluetooth_version":"5.3","codec":"AAC, LDAC","battery_hours":30,"weight_g":250,"has_microphone":true,"ip_rating":"IPX4","connectivity":"Bluetooth 5.3, 3.5mm"}
price_usd: retail price in USD (integer), null if unknown
form_factor: over-ear/on-ear/in-ear/tws
Use null for any value not found.
Now return the JSON for "${name}".`,

  monitor: (name) => `Search the web for the monitor named "${name}" and find its technical specifications and pricing.
Return a single JSON object only. No markdown, no explanation, no code fences:
{"price_usd":599,"display_inch":27.0,"display_resolution":"2560x1440","panel_type":"IPS","display_hz":165,"response_time_ms":1,"brightness_nits":400,"hdr":"HDR400","aspect_ratio":"16:9","adaptive_sync":"G-Sync Compatible, FreeSync Premium","curved":false,"vesa_mount":true,"weight_kg":5.2,"display_color_gamut":"sRGB 99%"}
price_usd: retail price in USD (integer), null if unknown
panel_type: IPS/VA/TN/OLED/QD-OLED/Mini-LED/WOLED
Use null for any value not found.
Now return the JSON for "${name}".`,

  tv: (name) => `Search the web for the TV named "${name}" and find its technical specifications and pricing.
Return a single JSON object only. No markdown, no explanation, no code fences:
{"price_usd":1799,"display_inch":65.0,"display_resolution":"3840x2160","panel_type":"OLED","display_hz":120,"hdr":"HDR10+, Dolby Vision, HLG","brightness_nits":800,"smart_platform":"webOS","audio_watts":60,"hdmi_ports":4,"usb_ports":3,"weight_kg":21.5,"thickness_mm":48,"display_color_gamut":"DCI-P3 99%"}
price_usd: retail price in USD (integer), null if unknown
panel_type: OLED/QLED/WOLED/QD-OLED/Mini-LED/LED/MICRO-LED
smart_platform: webOS/Tizen/Google TV/Android TV/Roku/Fire TV
Use null for any value not found.
Now return the JSON for "${name}".`,
}

const AMAZON_PROMPT = (name: string) => `Search Amazon.com for the product "${name}" and find its ASIN.

The ASIN is a 10-character alphanumeric code found in the Amazon product URL like:
https://www.amazon.com/dp/B0CHX2F5QT  → ASIN is B0CHX2F5QT

Search for the exact product on amazon.com and return the ASIN of the most relevant listing.

Return a single JSON object only. No markdown, no explanation, no code fences:
{"asin":"B0CHX2F5QT"}

Now return the JSON for "${name}". If not found on Amazon, return {"asin":null}.`

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { name, kind, category } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!['cpu', 'gpu', 'amazon', 'product_specs'].includes(kind)) {
    return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    if (kind === 'amazon') {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: AMAZON_PROMPT(name),
        config: { tools: [{ googleSearch: {} }] },
      })
      const text = response.text ?? ''
      if (!text) throw new Error('Empty response from Gemini')
      const result = extractJson(text)
      const asin = result.asin as string | null
      if (!asin) return NextResponse.json({ amazon_url: null })
      const amazon_url = `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`
      return NextResponse.json({ amazon_url })
    }

    if (kind === 'product_specs') {
      const promptFn = SPECS_PROMPT[category]
      if (!promptFn) return NextResponse.json({ error: `No spec prompt for category: ${category}` }, { status: 400 })
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: promptFn(name),
        config: { tools: [{ googleSearch: {} }] },
      })
      const text = response.text ?? ''
      if (!text) throw new Error('Empty response from Gemini')
      const specs = extractJson(text)
      return NextResponse.json({ specs })
    }

    const prompt = kind === 'cpu' ? CPU_PROMPT(name) : GPU_PROMPT(name)
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    })
    const text = response.text ?? ''
    if (!text) throw new Error('Empty response from Gemini')

    const specs = extractJson(text)
    return NextResponse.json({ specs })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[ai-fill] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
