'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'KRW' | 'JPY' | 'BRL' | 'MXN' | 'CAD' | 'AUD'

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string; flag: string }[] = [
  { code: 'USD', symbol: '$',   label: 'US Dollar',          flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',   label: 'Euro',               flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',   label: 'British Pound',      flag: '🇬🇧' },
  { code: 'KRW', symbol: '₩',   label: 'Korean Won',         flag: '🇰🇷' },
  { code: 'JPY', symbol: '¥',   label: 'Japanese Yen',       flag: '🇯🇵' },
  { code: 'BRL', symbol: 'R$',  label: 'Brazilian Real',     flag: '🇧🇷' },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso',       flag: '🇲🇽' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar',    flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$',  label: 'Australian Dollar',  flag: '🇦🇺' },
]

// Approximate static rates vs USD
const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  KRW: 1350,
  JPY: 157,
  BRL: 5.1,
  MXN: 17.2,
  CAD: 1.36,
  AUD: 1.53,
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  format: (usd: number) => string
  symbol: string
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  format: (n) => `$${n}`,
  symbol: '$',
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD')

  useEffect(() => {
    const saved = localStorage.getItem('pv_currency') as CurrencyCode | null
    if (saved && RATES[saved]) setCurrencyState(saved)
  }, [])

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c)
    localStorage.setItem('pv_currency', c)
  }

  const curr = CURRENCIES.find((c) => c.code === currency)!

  const format = (usd: number): string => {
    const converted = usd * RATES[currency]
    if (currency === 'KRW' || currency === 'JPY') {
      return `${curr.symbol}${Math.round(converted).toLocaleString()}`
    }
    return `${curr.symbol}${converted.toFixed(0)}`
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, symbol: curr.symbol }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
