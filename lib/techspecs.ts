const TECHSPECS_BASE = 'https://api.techspecs.io/v5'

function getHeaders() {
  return {
    'X-API-KEY': process.env.TECHSPECS_API_KEY!,
    'X-API-ID': process.env.TECHSPECS_APP_ID!,
    'Accept': 'application/json',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractSpecs(data: any) {
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

  const batteryCapacity = battery['Battery Capacity'] ?? battery['Capacity'] ?? null
  const batteryLife = battery['Battery Life'] ?? battery['Battery Life (Hours)'] ?? null
  const storage = inside.Storage?.['Internal Storage'] ?? inside.Storage?.['Storage'] ?? null
  const cpuSpeedMHz = inside.Processor?.['CPU Clock Speed_MHz']
  const performanceScore = cpuSpeedMHz
    ? Math.min(100, Math.round((cpuSpeedMHz / 4000) * 100))
    : null

  return {
    id: data._id as string,
    name: (product.Model ?? 'Unknown') as string,
    brand: (product.Brand ?? 'Unknown') as string,
    category: (product.Category ?? 'Unknown') as string,
    specs: {
      cpu: (inside.Processor?.CPU ?? null) as string | null,
      cpuSpeedMHz: (cpuSpeedMHz ?? null) as number | null,
      performanceScore,
      ram: (inside.RAM?.Capacity ?? null) as string | null,
      storage,
      display: displayData['Screen Size']
        ? `${displayData['Screen Size']} ${displayData['Display Type'] ?? ''}`.trim()
        : null,
      camera: mainCamera as string | null,
      batteryCapacity: batteryCapacity as string | null,
      batteryLife: batteryLife as string | null,
      os: (inside.Software?.['OS Version'] ?? inside.Software?.OS ?? null) as string | null,
      weight: (design.Weight ?? null) as string | null,
      weightG: (design.Weight_g ?? null) as number | null,
      ipRating: (design['IP Rating'] ?? null) as string | null,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: data as Record<string, any>,
  }
}

export type ProductDetail = ReturnType<typeof extractSpecs>

export async function fetchProductDetail(id: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${TECHSPECS_BASE}/products/${id}`, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 'success') return null
    return extractSpecs(json.data)
  } catch {
    return null
  }
}

export async function searchProducts(query: string, limit = 10) {
  const res = await fetch(
    `${TECHSPECS_BASE}/products/search?query=${encodeURIComponent(query)}`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  )
  if (!res.ok) return []
  const data = await res.json()

  const seen = new Set<string>()
  return (data.data ?? [])
    .filter((item: { Product: { Model: string } }) => {
      const model = item.Product.Model
      if (seen.has(model)) return false
      seen.add(model)
      return true
    })
    .slice(0, limit)
    .map((item: { Product: { id: string; Model: string; Brand: string; Category: string; Thumbnail?: string }; 'Release Date'?: string }) => ({
      id: item.Product.id,
      name: item.Product.Model,
      brand: item.Product.Brand,
      category: item.Product.Category,
      thumbnail: item.Product.Thumbnail ?? '',
      releaseDate: item['Release Date'] ?? '',
    }))
}
