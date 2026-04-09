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

const CPU_PROMPT = (name: string) => `Search the web for real benchmark scores and hardware specs for the CPU/SoC named "${name}".

Priority sources (check all and cross-reference):
- nanoreview.net — primary source for Geekbench 6 scores, 3DMark scores, and specs
- browser.geekbench.com — cross-check Geekbench 6 single/multi-core and GPU compute scores
- 3dmark.com or notebookcheck.net — cross-check 3DMark Steel Nomad Light score if nanoreview lacks it

Collect:
- Geekbench 6 single-core and multi-core scores (median from multiple runs)
- Geekbench 6 GPU compute score (Metal/Vulkan/OpenCL, for SoCs with integrated GPU)
- 3DMark Steel Nomad Light score specifically (not other 3DMark tests)
- Core count, base clock GHz, boost clock GHz
- Integrated GPU name

Return a single JSON object only. No markdown, no explanation, no code fences:
{"brand":"Apple","type":"mobile","cores":6,"clock_base":3.0,"clock_boost":4.0,"gpu_name":"Apple GPU (6-core)","gb6_single":3500,"gb6_multi":8000,"igpu_gb6_single":22000,"tdmark_score":null}

Now return the JSON for "${name}". Use null for any value not found.`

const GPU_PROMPT = (name: string) => `Search the web for real benchmark scores and hardware specs for the GPU named "${name}".

Priority sources (check all and cross-reference):
- nanoreview.net — primary source for Geekbench 6 scores, 3DMark scores, and specs
- browser.geekbench.com — cross-check Geekbench 6 Metal/Vulkan/OpenCL scores
- 3dmark.com or notebookcheck.net — cross-check 3DMark Steel Nomad Light score if nanoreview lacks it

Collect:
- Geekbench 6 GPU Metal/Vulkan score (median)
- Geekbench 6 OpenCL score (median)
- 3DMark Steel Nomad Light score specifically (not other 3DMark tests)
- Shader/compute core count
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
