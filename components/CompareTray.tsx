'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronUp, ChevronDown, GitCompare } from 'lucide-react'
import { useCompareCart } from '@/lib/compareCart'
import { useI18n } from '@/lib/i18n'

export default function CompareTray() {
  const { cart, remove, clear } = useCompareCart()
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()
  const { t } = useI18n()

  if (cart.length === 0) return null

  const canCompare = cart.length >= 2

  const handleCompare = () => {
    const ids = cart.map((p) => p.id).join(',')
    const variants = cart.map((p) => p.variantId ?? '').join(',')
    const hasVariants = cart.some((p) => p.variantId)
    clear()
    router.push(`/compare?ids=${ids}${hasVariants ? `&variants=${variants}` : ''}`)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* 펼쳐진 트레이 */}
      {expanded && (
        <div className="bg-surface-2/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl w-72 overflow-hidden animate-slide-up">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <GitCompare className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-white">
                {t('tray.comparing').replace('{n}', String(cart.length))}
              </span>
            </div>
            <button
              onClick={clear}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              {t('tray.clear_all')}
            </button>
          </div>

          {/* 제품 목록 */}
          <div className="p-3 space-y-2">
            {cart.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                  <p className="text-[10px] text-white/30">{product.brand}</p>
                </div>
                <button
                  onClick={() => remove(product.id)}
                  className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* 빈 슬롯 */}
            {cart.length < 4 && Array.from({ length: Math.min(4 - cart.length, 2) }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border border-dashed border-border rounded-xl px-3 py-2.5"
              >
                <div className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
                <p className="text-xs text-white/20">{t('tray.add_product')}</p>
              </div>
            ))}
          </div>

          {/* 비교 버튼 */}
          <div className="px-3 pb-3">
            <button
              onClick={handleCompare}
              disabled={!canCompare}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                canCompare
                  ? 'bg-accent hover:bg-accent/90 text-white'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {canCompare
                ? t('tray.compare_n').replace('{n}', String(cart.length))
                : t('tray.add_more')}
            </button>
          </div>
        </div>
      )}

      {/* 토글 버튼 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 bg-surface-2/95 backdrop-blur-md border border-border rounded-full px-4 py-2.5 shadow-xl hover:border-white/20 transition-all"
      >
        <GitCompare className="w-4 h-4 text-accent" />
        <span className="text-sm font-bold text-white">{cart.length}</span>
        <span className="text-xs text-white/40">{t('tray.in_tray')}</span>
        {expanded
          ? <ChevronDown className="w-3.5 h-3.5 text-white/40" />
          : <ChevronUp className="w-3.5 h-3.5 text-white/40" />
        }
      </button>
    </div>
  )
}
