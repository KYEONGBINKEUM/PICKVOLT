'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useI18n, LANGUAGES, type Locale } from '@/lib/i18n'
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/lib/currency'

export function LocalePopup() {
  const { locale, setLocale } = useI18n()
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors ${open ? 'text-white bg-surface-2' : 'text-white/40 hover:text-white'}`}
      >
        <Globe className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-surface-2 border border-border rounded-2xl shadow-2xl w-56 z-50 overflow-hidden">
          {/* Language */}
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Language</p>
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code as Locale); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-surface ${
                locale === lang.code ? 'text-accent' : 'text-white/60'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          ))}

          <div className="border-t border-border mx-4 my-1" />

          {/* Currency */}
          <div className="px-4 pt-1 pb-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Currency</p>
          </div>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code as CurrencyCode); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors hover:bg-surface ${
                currency === c.code ? 'text-accent' : 'text-white/60'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="font-semibold">{c.symbol}</span>
              <span>{c.code}</span>
              {currency === c.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
          ))}
          <div className="pb-2" />
        </div>
      )}
    </div>
  )
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find((l) => l.code === locale)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors py-1"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{current.flag} {current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-surface-2 border border-border rounded-2xl overflow-hidden shadow-2xl w-44 z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code as Locale); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors hover:bg-surface ${
                locale === lang.code ? 'text-accent' : 'text-white/60'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = CURRENCIES.find((c) => c.code === currency)!

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors py-1"
      >
        <span>{current.flag} {current.symbol} {current.code}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-surface-2 border border-border rounded-2xl overflow-hidden shadow-2xl w-52 z-50">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code as CurrencyCode); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors hover:bg-surface ${
                currency === c.code ? 'text-accent' : 'text-white/60'
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="font-semibold">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="ml-auto text-white/30">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
