'use client'

import { Plus, Check } from 'lucide-react'
import { useCompareCart, type CartProduct } from '@/lib/compareCart'

export default function AddToCompareButton({ product }: { product: CartProduct }) {
  const { add, has, cart } = useCompareCart()
  const inCart = has(product.id)
  const cartFull = cart.length >= 4

  return (
    <button
      onClick={() => add(product)}
      disabled={inCart || cartFull}
      className={`flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-full transition-colors ${
        inCart
          ? 'bg-accent/20 text-accent cursor-default'
          : cartFull
          ? 'bg-white/5 text-white/30 cursor-not-allowed'
          : 'bg-white text-black hover:bg-white/90'
      }`}
    >
      {inCart
        ? <><Check className="w-3.5 h-3.5" /> added to compare</>
        : <><Plus className="w-3.5 h-3.5" /> add to comparison</>
      }
    </button>
  )
}
