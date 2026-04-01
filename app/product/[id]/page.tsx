import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AddToCompareButton from './AddToCompareButton'
import { fetchProductDetail } from '@/lib/techspecs'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await fetchProductDetail(id)

  if (!product || product.specs === undefined) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-white/40 text-sm mb-4">제품을 찾을 수 없습니다.</p>
            <Link href="/" className="text-accent text-sm hover:underline">홈으로 →</Link>
          </div>
        </main>
      </>
    )
  }

  const specList = [
    { label: 'processor', value: product.specs.cpu },
    { label: 'RAM', value: product.specs.ram },
    { label: 'storage', value: product.specs.storage },
    { label: 'display', value: product.specs.display },
    { label: 'main camera', value: product.specs.camera },
    { label: 'battery', value: product.specs.batteryCapacity },
    { label: 'battery life', value: product.specs.batteryLife },
    { label: 'OS', value: product.specs.os },
    { label: 'weight', value: product.specs.weight },
    { label: 'IP rating', value: product.specs.ipRating },
  ].filter((s) => s.value)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pb-32">

        {/* Hero */}
        <div className="pt-24 px-6 max-w-inner mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/30 hover:text-white text-xs mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            back
          </Link>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* 이미지 placeholder */}
            <div className="aspect-square rounded-card bg-surface-2 border border-border flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <p className="text-2xl font-black text-white/10">{product.brand}</p>
                <p className="text-xs text-white/20 mt-2">{product.category}</p>
              </div>
            </div>

            {/* 제품 정보 */}
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-bold text-accent mb-1">{product.brand}</p>
                <h1 className="text-4xl font-black text-white leading-none mb-3">{product.name}</h1>
                <p className="text-xs text-white/30 uppercase tracking-widest">{product.category}</p>
              </div>

              {/* 핵심 스펙 하이라이트 */}
              {(product.specs.cpu || product.specs.ram || product.specs.camera) && (
                <div className="flex flex-wrap gap-2">
                  {product.specs.cpu && (
                    <span className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-white/60">
                      {product.specs.cpu.split(' ').slice(0, 3).join(' ')}
                    </span>
                  )}
                  {product.specs.ram && (
                    <span className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-white/60">
                      {product.specs.ram} RAM
                    </span>
                  )}
                  {product.specs.camera && (
                    <span className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-white/60">
                      {product.specs.camera}
                    </span>
                  )}
                  {product.specs.ipRating && (
                    <span className="px-3 py-1.5 rounded-full bg-surface-2 border border-border text-xs text-white/60">
                      {product.specs.ipRating}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 전체 스펙 */}
        <div className="mt-14 px-6 max-w-inner mx-auto">
          <h2 className="text-sm font-black text-white mb-4">full specifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {specList.map((spec) => (
              <div key={spec.label} className="bg-surface border border-border rounded-card px-5 py-4">
                <p className="text-xs text-white/30 mb-1">{spec.label}</p>
                <p className="text-base font-black text-white leading-tight">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <footer className="mt-16 border-t border-border py-8">
          <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" />
              <span className="font-bold text-white">pickvolt</span>
            </div>
            <p className="text-xs text-white/20">© 2024 pickvolt. data from techspecs.io</p>
          </div>
        </footer>
      </main>

      {/* 하단 고정 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-6 px-6 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-surface-2/90 backdrop-blur-md border border-border rounded-full px-6 py-3 shadow-2xl">
          <AddToCompareButton
            product={{
              id: product.id,
              name: product.name,
              brand: product.brand,
              category: product.category,
            }}
          />
        </div>
      </div>
    </>
  )
}
