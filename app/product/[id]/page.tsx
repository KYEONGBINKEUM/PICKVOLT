import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Plus } from 'lucide-react'

const MOCK_PRODUCT = {
  id: 'pixel-8-pro',
  name: 'pixel 8 pro',
  brand: 'google',
  price: 899,
  description: 'the smartest pixel yet, built for photography enthusiasts and ai power users.',
  sentiment: 8.9,
  reviews: '2,400',
  tags: ['best camera 2024', 'clean android', '7 years updates'],
  specs: [
    { label: 'processor', value: 'google tensor g3' },
    { label: 'display', value: '6.7" ltpo oled' },
    { label: 'peak brightness', value: '2400 nits' },
    { label: 'main sensor', value: '50mp (f/1.68)' },
    { label: 'battery', value: '5050 mah' },
    { label: 'os support', value: 'until 2030' },
    { label: 'weight', value: '213 grams' },
    { label: 'ai features', value: 'magic editor' },
  ],
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = MOCK_PRODUCT

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pb-32">

        {/* Hero section */}
        <div className="pt-24 px-6 max-w-inner mx-auto">
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 text-white/30 hover:text-white text-xs mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            back
          </Link>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Product image */}
            <div className="aspect-square rounded-card bg-surface-2 border border-border flex items-center justify-center overflow-hidden">
              <div className="w-32 h-48 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="w-16 h-3 bg-white/10 rounded-full" />
              </div>
            </div>

            {/* Product info */}
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-bold text-accent mb-1">{product.brand}</p>
                <h1 className="text-5xl font-black text-white leading-none mb-3">{product.name}</h1>
                <p className="text-sm text-white/50 leading-relaxed">{product.description}</p>
              </div>

              {/* Sentiment score */}
              <div className="inline-flex items-center gap-4 bg-surface border border-border rounded-2xl px-5 py-4 w-fit">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#2a2a2a" strokeWidth="3" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke="#FF4D00" strokeWidth="3"
                      strokeDasharray={`${(product.sentiment / 10) * 150.8} 150.8`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-lg font-black text-white relative z-10">{product.sentiment}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">user sentiment</p>
                  <p className="text-xs text-white/40">based on {product.reviews} reviews</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-white/50">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Photo samples */}
        <div className="mt-14 px-6 max-w-inner mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-white">photo quality samples</h2>
            <span className="text-xs text-white/30">unprocessed raw outputs</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="row-span-2 rounded-card bg-surface-2 border border-border aspect-[3/4] flex items-center justify-center">
              <span className="text-xs text-white/20 uppercase tracking-widest">sample</span>
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-card bg-surface-2 border border-border aspect-video flex items-center justify-center">
                <span className="text-xs text-white/20 uppercase tracking-widest">sample</span>
              </div>
            ))}
          </div>
        </div>

        {/* Full specs */}
        <div className="mt-14 px-6 max-w-inner mx-auto">
          <h2 className="text-sm font-black text-white mb-4">full specifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {product.specs.map((spec) => (
              <div key={spec.label} className="bg-surface border border-border rounded-card px-5 py-4">
                <p className="text-xs text-white/30 mb-1">{spec.label}</p>
                <p className="text-lg font-black text-white">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-border py-8">
          <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span className="font-bold text-white">pickvolt</span>
            </div>
            <p className="text-xs text-white/20">© 2024 pickvolt. all data pulled from official manufacturer whitepapers.</p>
          </div>
        </footer>
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-6 px-6 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-surface-2/90 backdrop-blur-md border border-border rounded-full px-6 py-3 shadow-2xl">
          <div>
            <p className="text-xs text-white/40">starting from</p>
            <p className="text-sm font-black text-white">${product.price}.00</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <a
            href="#"
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-semibold transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            buy now
          </a>
          <Link
            href={`/compare?q=${encodeURIComponent(product.name)}`}
            className="flex items-center gap-2 bg-white text-black text-sm font-bold px-5 py-2 rounded-full hover:bg-white/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            add to comparison
          </Link>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-surface-2 border border-border rounded-l-xl px-2 py-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            full technical specifications
          </p>
        </div>
      </div>
    </>
  )
}
