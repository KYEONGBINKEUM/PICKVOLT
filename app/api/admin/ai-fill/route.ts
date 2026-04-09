import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

const CPU_PROMPT = (name: string) => `Search the web for real benchmark scores and specs for the CPU/SoC named "${name}".

Look up:
- Geekbench 6 single-core and multi-core scores (from browser.geekbench.com)
- Geekbench 6 GPU compute score (Metal/Vulkan/OpenCL, for SoCs with integrated GPU)
- 3DMark score if available
- Core count, base clock, boost clock (GHz)
- Integrated GPU name

Return JSON only (no markdown, no explanation):
{
  "brand": "Apple | Qualcomm | MediaTek | Samsung | Intel | AMD | HiSilicon | ...",
  "type": "mobile | laptop | desktop",
  "cores": <integer or null>,
  "clock_base": <GHz as float or null>,
  "clock_boost": <GHz as float or null>,
  "gpu_name": "<integrated GPU name or null>",
  "gb6_single": <Geekbench 6 single-core score integer or null>,
  "gb6_multi": <Geekbench 6 multi-core score integer or null>,
  "igpu_gb6_single": <Geekbench 6 GPU compute score integer or null>,
  "tdmark_score": <3DMark score integer or null>
}

Use the median/typical real-world score found in search results. Use null if not found.`

const GPU_PROMPT = (name: string) => `Search the web for real benchmark scores and specs for the GPU named "${name}".

Look up:
- Geekbench 6 GPU Metal/Vulkan score (from browser.geekbench.com)
- Geekbench 6 OpenCL score
- 3DMark score if available
- Shader/compute core count
- Whether it is a mobile, laptop, or desktop GPU

Return JSON only (no markdown, no explanation):
{
  "brand": "Apple | NVIDIA | AMD | Intel | Qualcomm (Adreno) | ARM (Mali) | Imagination (PowerVR) | MediaTek | ...",
  "type": "mobile | laptop | desktop",
  "cores": <shader/compute core count integer or null>,
  "gb6_single": <Geekbench 6 GPU Metal/Vulkan score integer or null>,
  "gb6_opencl": <Geekbench 6 OpenCL score integer or null>,
  "tdmark_score": <3DMark score integer or null>
}

Use the median/typical real-world score found in search results. Use null if not found.`

async function callGemini(prompt: string): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  })
  return response.text ?? ''
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in response')
  return JSON.parse(match[0])
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
    const text = await callGemini(prompt)
    const result = extractJson(text)
    return NextResponse.json({ specs: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
