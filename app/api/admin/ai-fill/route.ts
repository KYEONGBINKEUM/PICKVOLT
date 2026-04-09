import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
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
  return ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
}

const CPU_PROMPT = (name: string) => `Search nanoreview.net for the CPU/SoC named "${name}" and extract its benchmark scores and specs.

Go to nanoreview.net and find the page for "${name}". Extract values from these exact HTML patterns:

Cores: <li class="mb"><strong>Cores:</strong> 6</li>  → take the integer after "Cores:"
Clock: <li class="mb"><strong>Clock:</strong> 4260 MHz</li>  → convert MHz to GHz (e.g. 4260 → 4.26), use as clock_base; leave clock_boost null unless a separate boost clock is listed

GB6 Single-Core Score:
<div class="score-bar-name">Single-Core Score</div>
<span class="score-bar-result-number">3992</span>
→ take the integer in score-bar-result-number

GB6 Multi-Core Score:
<div class="score-bar-name">Multi-Core Score</div>
<span class="score-bar-result-number">10688</span>
→ take the integer in score-bar-result-number

GB6 GPU Compute Score (for SoCs with integrated GPU):
<div class="score-bar-name">Compute Score (GPU)</div>
<span class="score-bar-result-number">45527</span>
→ take the integer in score-bar-result-number

Also extract:
- 3DMark Steel Nomad Light score (not other 3DMark tests)
- Integrated GPU name

Return a single JSON object only. No markdown, no explanation, no code fences:
{"brand":"Apple","type":"mobile","cores":6,"clock_base":3.0,"clock_boost":4.0,"gpu_name":"Apple GPU (6-core)","gb6_single":3500,"gb6_multi":8000,"igpu_gb6_single":22000,"tdmark_score":null}

Now return the JSON for "${name}". Use null for any value not found.`

const GPU_PROMPT = (name: string) => `Search nanoreview.net for the GPU named "${name}" and extract its benchmark scores and specs.

Go to nanoreview.net and find the page for "${name}". Extract values from these exact HTML patterns:

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
- 3DMark Steel Nomad Light score (not other 3DMark tests)
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

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { name, kind } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (kind !== 'cpu' && kind !== 'gpu') return NextResponse.json({ error: 'kind must be cpu or gpu' }, { status: 400 })

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
  }

  try {
    const prompt = kind === 'cpu' ? CPU_PROMPT(name) : GPU_PROMPT(name)

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
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
