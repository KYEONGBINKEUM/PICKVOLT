'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface CartProduct {
  id: string
  name: string
  brand: string
  category: string
  variantId?: string
}

interface CompareCartContext {
  cart: CartProduct[]
  add: (product: CartProduct) => void
  remove: (id: string) => void
  clear: () => void
  has: (id: string) => boolean
}

const CompareCartContext = createContext<CompareCartContext | null>(null)

export function CompareCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartProduct[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pv_compare_cart')
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  const persist = (items: CartProduct[]) => {
    setCart(items)
    try { localStorage.setItem('pv_compare_cart', JSON.stringify(items)) } catch {}
  }

  const add = useCallback((product: CartProduct) => {
    setCart((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev
      if (prev.length >= 4) return prev // 최대 4개
      const next = [...prev, product]
      try { localStorage.setItem('pv_compare_cart', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setCart((prev) => {
      const next = prev.filter((p) => p.id !== id)
      try { localStorage.setItem('pv_compare_cart', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const clear = useCallback(() => persist([]), [])

  const has = useCallback((id: string) => cart.some((p) => p.id === id), [cart])

  return (
    <CompareCartContext.Provider value={{ cart, add, remove, clear, has }}>
      {children}
    </CompareCartContext.Provider>
  )
}

export function useCompareCart() {
  const ctx = useContext(CompareCartContext)
  if (!ctx) throw new Error('useCompareCart must be used within CompareCartProvider')
  return ctx
}
