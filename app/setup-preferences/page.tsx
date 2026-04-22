'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n, LANGUAGES, type Locale } from '@/lib/i18n'
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/lib/currency'

// ── Country data ────────────────────────────────────────────────
interface Country {
  code: string
  name: string
  flag: string
  locale: Locale
  currency: CurrencyCode
}

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States',    flag: '🇺🇸', locale: 'en', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom',   flag: '🇬🇧', locale: 'en', currency: 'GBP' },
  { code: 'CA', name: 'Canada',           flag: '🇨🇦', locale: 'en', currency: 'CAD' },
  { code: 'AU', name: 'Australia',        flag: '🇦🇺', locale: 'en', currency: 'AUD' },
  { code: 'KR', name: '대한민국',          flag: '🇰🇷', locale: 'ko', currency: 'KRW' },
  { code: 'JP', name: '日本',              flag: '🇯🇵', locale: 'ja', currency: 'JPY' },
  { code: 'DE', name: 'Deutschland',      flag: '🇩🇪', locale: 'de', currency: 'EUR' },
  { code: 'FR', name: 'France',           flag: '🇫🇷', locale: 'fr', currency: 'EUR' },
  { code: 'ES', name: 'España',           flag: '🇪🇸', locale: 'es', currency: 'EUR' },
  { code: 'IT', name: 'Italia',           flag: '🇮🇹', locale: 'en', currency: 'EUR' },
  { code: 'PT', name: 'Portugal',         flag: '🇵🇹', locale: 'pt', currency: 'EUR' },
  { code: 'BR', name: 'Brasil',           flag: '🇧🇷', locale: 'pt', currency: 'BRL' },
  { code: 'MX', name: 'México',           flag: '🇲🇽', locale: 'es', currency: 'MXN' },
  { code: 'AR', name: 'Argentina',        flag: '🇦🇷', locale: 'es', currency: 'USD' },
  { code: 'CO', name: 'Colombia',         flag: '🇨🇴', locale: 'es', currency: 'USD' },
  { code: 'CL', name: 'Chile',            flag: '🇨🇱', locale: 'es', currency: 'USD' },
  { code: 'NL', name: 'Nederland',        flag: '🇳🇱', locale: 'en', currency: 'EUR' },
  { code: 'BE', name: 'Belgium',          flag: '🇧🇪', locale: 'fr', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland',      flag: '🇨🇭', locale: 'de', currency: 'EUR' },
  { code: 'AT', name: 'Österreich',       flag: '🇦🇹', locale: 'de', currency: 'EUR' },
  { code: 'PL', name: 'Polska',           flag: '🇵🇱', locale: 'en', currency: 'USD' },
  { code: 'SE', name: 'Sverige',          flag: '🇸🇪', locale: 'en', currency: 'USD' },
  { code: 'NO', name: 'Norge',            flag: '🇳🇴', locale: 'en', currency: 'USD' },
  { code: 'DK', name: 'Danmark',          flag: '🇩🇰', locale: 'en', currency: 'USD' },
  { code: 'FI', name: 'Suomi',            flag: '🇫🇮', locale: 'en', currency: 'EUR' },
  { code: 'SG', name: 'Singapore',        flag: '🇸🇬', locale: 'en', currency: 'USD' },
  { code: 'HK', name: 'Hong Kong',        flag: '🇭🇰', locale: 'en', currency: 'USD' },
  { code: 'TW', name: '台灣',              flag: '🇹🇼', locale: 'en', currency: 'USD' },
  { code: 'CN', name: '中国',              flag: '🇨🇳', locale: 'en', currency: 'USD' },
  { code: 'IN', name: 'India',            flag: '🇮🇳', locale: 'en', currency: 'USD' },
  { code: 'TH', name: 'ประเทศไทย',        flag: '🇹🇭', locale: 'en', currency: 'USD' },
  { code: 'VN', name: 'Việt Nam',         flag: '🇻🇳', locale: 'en', currency: 'USD' },
  { code: 'PH', name: 'Philippines',      flag: '🇵🇭', locale: 'en', currency: 'USD' },
  { code: 'MY', name: 'Malaysia',         flag: '🇲🇾', locale: 'en', currency: 'USD' },
  { code: 'ID', name: 'Indonesia',        flag: '🇮🇩', locale: 'en', currency: 'USD' },
  { code: 'SA', name: 'Saudi Arabia',     flag: '🇸🇦', locale: 'en', currency: 'USD' },
  { code: 'AE', name: 'UAE',              flag: '🇦🇪', locale: 'en', currency: 'USD' },
  { code: 'TR', name: 'Türkiye',          flag: '🇹🇷', locale: 'en', currency: 'USD' },
  { code: 'RU', name: 'Россия',           flag: '🇷🇺', locale: 'en', currency: 'USD' },
  { code: 'ZA', name: 'South Africa',     flag: '🇿🇦', locale: 'en', currency: 'USD' },
  { code: 'NG', name: 'Nigeria',          flag: '🇳🇬', locale: 'en', currency: 'USD' },
  { code: 'EG', name: 'Egypt',            flag: '🇪🇬', locale: 'en', currency: 'USD' },
  { code: 'NZ', name: 'New Zealand',      flag: '🇳🇿', locale: 'en', currency: 'AUD' },
  { code: 'IE', name: 'Ireland',          flag: '🇮🇪', locale: 'en', currency: 'EUR' },
]

// ── Component ────────────────────────────────────────────────────
export default function SetupPreferencesPage() {
  const router = useRouter()
  const { setLocale } = useI18n()
  const { setCurrency } = useCurrency()

  const [checking, setChecking]   = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)
  const [query, setQuery]         = useState('')
  const [selected, setSelected]   = useState<Country | null>(null)
  const [locale, setLocaleState]  = useState<Locale>('en')
  const [currency, setCurrState]  = useState<CurrencyCode>('USD')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('user_id, country')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!data) { router.replace('/setup-nickname'); return }
      if (data.country) { router.replace('/mypage'); return }  // already set
      setUserId(user.id)
      setChecking(false)
    })
  }, [router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
  }, [query])

  const handleSelect = (country: Country) => {
    setSelected(country)
    setLocaleState(country.locale)
    setCurrState(country.currency)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      country: selected?.code ?? null,
      locale,
      currency,
    }).eq('user_id', userId)

    // Apply to client-side state
    setLocale(locale)
    setCurrency(currency)
    router.replace('/mypage')
  }

  const handleSkip = () => {
    router.replace('/mypage')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-start px-4 pt-16 pb-20">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <span className="w-2.5 h-2.5 rounded-full bg-accent" />
        <span className="font-bold text-white text-base">pickvolt</span>
      </Link>

      {/* Step dots */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1 rounded-full transition-all ${s < 3 ? 'w-4 bg-accent/50' : 'w-8 bg-accent'}`} />
        ))}
      </div>

      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-1.5">where are you from?</h1>
        <p className="text-sm text-white/40 mb-8">
          we&apos;ll set your language, currency, and regional defaults automatically.
        </p>

        {/* Country search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search country..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Country grid */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
          <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/25">No results</div>
            ) : filtered.map(country => (
              <button
                key={country.code}
                onClick={() => handleSelect(country)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  selected?.code === country.code
                    ? 'bg-accent/10 text-white'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span className="text-lg leading-none flex-shrink-0">{country.flag}</span>
                <span className="text-sm font-medium flex-1">{country.name}</span>
                {selected?.code === country.code && (
                  <Check className="w-4 h-4 text-accent flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Language selection */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Language</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLocaleState(lang.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  locale === lang.code
                    ? 'bg-accent/15 border-accent/40 text-white'
                    : 'bg-surface border-border text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Currency selection */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Currency</p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map(cur => (
              <button
                key={cur.code}
                onClick={() => setCurrState(cur.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  currency === cur.code
                    ? 'bg-accent/15 border-accent/40 text-white'
                    : 'bg-surface border-border text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                <span className="font-mono">{cur.symbol}</span>
                {cur.code}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={saving || !selected}
          className="w-full py-3.5 rounded-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-white font-bold text-sm transition-colors mb-3"
        >
          {saving ? 'saving...' : 'continue'}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-2.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          skip for now
        </button>
      </div>
    </main>
  )
}
