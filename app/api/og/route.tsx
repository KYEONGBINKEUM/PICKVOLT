import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// /api/og?type=product&name=MacBook Pro 16&brand=Apple&category=laptop&score=94&price=1299
// /api/og?type=compare&p=iPhone 16 Pro&p=Galaxy S26 Ultra
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'product'

  if (type === 'compare') {
    const products = searchParams.getAll('p').slice(0, 4)
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px', height: '630px',
            background: '#0a0a0a',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            fontFamily: 'sans-serif', padding: '60px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgb(255,77,0)' }} />
            <span style={{ color: 'white', fontSize: '22px', fontWeight: 700 }}>pickvolt</span>
          </div>

          {/* Products */}
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%' }}>
            {products.map((name, i) => (
              <div
                key={i}
                style={{
                  flex: 1, background: '#161616', borderRadius: '16px',
                  border: '1px solid #2a2a2a', padding: '28px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {i === 0 ? 'vs' : `#${i + 1}`}
                </span>
                <span style={{ color: 'white', fontSize: '18px', fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
                  {name}
                </span>
              </div>
            ))}
          </div>

          {/* VS label */}
          {products.length >= 2 && (
            <div style={{
              marginTop: '36px', color: 'rgba(255,77,0,0.8)', fontSize: '15px',
              fontWeight: 700, letterSpacing: '0.15em',
            }}>
              AI-POWERED COMPARISON
            </div>
          )}
        </div>
      ),
      { width: 1200, height: 630 },
    )
  }

  // Product OG
  const name     = searchParams.get('name')     ?? 'Product'
  const brand    = searchParams.get('brand')    ?? ''
  const category = searchParams.get('category') ?? ''
  const score    = searchParams.get('score')
  const price    = searchParams.get('price')

  const categoryLabel: Record<string, string> = { laptop: 'Laptop', smartphone: 'Smartphone', tablet: 'Tablet' }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: '#0a0a0a',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'sans-serif', padding: '60px 72px',
        }}
      >
        {/* Top — logo + category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgb(255,77,0)' }} />
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>pickvolt</span>
          </div>
          {category && (
            <span style={{ color: 'rgba(255,77,0,0.7)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {categoryLabel[category] ?? category}
            </span>
          )}
        </div>

        {/* Center — product name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {brand && (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '20px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {brand}
            </span>
          )}
          <span style={{ color: 'white', fontSize: name.length > 30 ? '42px' : '54px', fontWeight: 900, lineHeight: 1.1 }}>
            {name}
          </span>
        </div>

        {/* Bottom — score + price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {score && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overall Score</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ color: 'rgb(255,77,0)', fontSize: '52px', fontWeight: 900 }}>{score}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '20px', fontWeight: 600 }}>/100</span>
              </div>
            </div>
          )}
          {price && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>From</span>
              <span style={{ color: 'white', fontSize: '36px', fontWeight: 900 }}>${price}</span>
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
