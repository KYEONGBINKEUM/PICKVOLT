import { NextRequest, NextResponse } from 'next/server'

// Mock product database — replace with TechSpecs API integration
const MOCK_PRODUCTS = [
  {
    id: 'iphone-15-pro',
    name: 'iphone 15 pro',
    brand: 'apple',
    price: 999,
    category: 'smartphone',
    specs: { performance: 98, battery: 22, optics: 48, ram: '8gb', storage: '256gb' },
  },
  {
    id: 'pixel-8-pro',
    name: 'pixel 8 pro',
    brand: 'google',
    price: 899,
    category: 'smartphone',
    specs: { performance: 92, battery: 20, optics: 50, ram: '12gb', storage: '256gb' },
  },
  {
    id: 's24-ultra',
    name: 's24 ultra',
    brand: 'samsung',
    price: 1199,
    category: 'smartphone',
    specs: { performance: 96, battery: 24, optics: 200, ram: '12gb', storage: '256gb' },
  },
  {
    id: 'macbook-pro-m3',
    name: 'macbook pro m3',
    brand: 'apple',
    price: 1999,
    category: 'laptop',
    specs: { performance: 99, battery: 18, optics: 12, ram: '18gb', storage: '512gb' },
  },
  {
    id: 'dell-xps-15',
    name: 'dell xps 15',
    brand: 'dell',
    price: 1799,
    category: 'laptop',
    specs: { performance: 91, battery: 12, optics: 0, ram: '16gb', storage: '512gb' },
  },
  {
    id: 'sony-wh1000xm5',
    name: 'sony wh-1000xm5',
    brand: 'sony',
    price: 349,
    category: 'headphones',
    specs: { performance: 88, battery: 30, optics: 0, anc: 'class-leading', codec: 'ldac' },
  },
  {
    id: 'bose-qc-ultra',
    name: 'bose qc ultra',
    brand: 'bose',
    price: 429,
    category: 'headphones',
    specs: { performance: 86, battery: 24, optics: 0, anc: 'excellent', codec: 'aptx-adaptive' },
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase() ?? ''
  const limit = parseInt(searchParams.get('limit') ?? '10')

  const results = q
    ? MOCK_PRODUCTS.filter(
        (p) =>
          p.name.includes(q) ||
          p.brand.includes(q) ||
          p.category.includes(q)
      ).slice(0, limit)
    : MOCK_PRODUCTS.slice(0, limit)

  return NextResponse.json({ results, total: results.length })
}
