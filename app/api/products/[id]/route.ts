import { NextRequest, NextResponse } from 'next/server'

const TECHSPECS_BASE = 'https://api.techspecs.io/v5'

// TechSpecs 데이터에서 핵심 스펙 추출
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSpecs(data: any) {
  const product = data.Product ?? {}
  const inside = data.Inside ?? {}
  const design = data.Design?.Body ?? {}
  const displayData = data.Display?.Screen ?? {}
  const camera = data.Camera ?? {}
  const battery = data.Battery?.Battery ?? {}

  const mainCamera =
    camera['Main Camera']?.['Main Camera Resolution'] ??
    camera.Main?.['Main Camera Resolution'] ??
    camera.Optics?.['Main Camera Resolution'] ??
    null

  const batteryCapacity =
    battery['Battery Capacity'] ??
    battery['Capacity'] ??
    null

  const batteryLife =
    battery['Battery Life'] ??
    battery['Battery Life (Hours)'] ??
    null

  const storage =
    inside.Storage?.['Internal Storage'] ??
    inside.Storage?.['Storage'] ??
    null

  const cpuSpeedMHz = inside.Processor?.['CPU Clock Speed_MHz']
  // CPU 속도를 0-100 퍼포먼스 점수로 환산 (기준: 4000MHz = 100)
  const performanceScore = cpuSpeedMHz
    ? Math.min(100, Math.round((cpuSpeedMHz / 4000) * 100))
    : null

  return {
    id: data._id,
    name: product.Model ?? 'Unknown',
    brand: product.Brand ?? 'Unknown',
    category: product.Category ?? 'Unknown',
    specs: {
      cpu: inside.Processor?.CPU ?? null,
      cpuSpeedMHz: cpuSpeedMHz ?? null,
      performanceScore,
      ram: inside.RAM?.Capacity ?? null,
      storage,
      display: displayData['Screen Size']
        ? `${displayData['Screen Size']} ${displayData['Display Type'] ?? ''}`.trim()
        : null,
      camera: mainCamera,
      batteryCapacity,
      batteryLife,
      os: inside.Software?.['OS Version'] ?? inside.Software?.OS ?? null,
      weight: design.Weight ?? null,
      weightG: design.Weight_g ?? null,
      ipRating: design['IP Rating'] ?? null,
    },
    // AI 비교용 전체 raw 데이터
    raw: data,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const res = await fetch(`${TECHSPECS_BASE}/products/${id}`, {
    headers: {
      'X-API-KEY': process.env.TECHSPECS_API_KEY!,
      'X-API-ID': process.env.TECHSPECS_APP_ID!,
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: '제품을 찾을 수 없습니다.' }, { status: res.status })
  }

  const json = await res.json()

  if (json.status !== 'success') {
    return NextResponse.json({ error: '제품 데이터를 가져오지 못했습니다.' }, { status: 404 })
  }

  return NextResponse.json(extractSpecs(json.data))
}
