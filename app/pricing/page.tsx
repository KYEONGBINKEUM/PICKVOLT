'use client'

import { Check, X, Zap } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n } from '@/lib/i18n'

export default function PricingPage() {
  const { t } = useI18n()

  const FREE_FEATURES = [
    t('pricing.free_feat1'),
    t('pricing.free_feat2'),
    t('pricing.free_feat3'),
  ]
  const FREE_MISSING = [t('pricing.free_missing1')]

  const PRO_FEATURES = [
    t('pricing.pro_feat1'),
    t('pricing.pro_feat2'),
    t('pricing.pro_feat3'),
    t('pricing.pro_feat4'),
    t('pricing.pro_feat5'),
  ]

  const TABLE_ROWS = [
    { label: t('pricing.row_daily'), free: t('pricing.row_daily_free'), pro: t('pricing.row_daily_pro'), proHighlight: true },
    { label: t('pricing.row_ai'), free: t('pricing.row_ai_free'), pro: t('pricing.row_ai_pro'), proHighlight: true },
    { label: t('pricing.row_export'), free: '—', pro: t('pricing.row_export_pro'), proHighlight: false },
    { label: t('pricing.row_search'), free: t('pricing.row_search_free'), pro: t('pricing.row_search_pro'), proHighlight: false },
    { label: t('pricing.row_alerts'), free: '—', pro: t('pricing.row_alerts_pro'), proHighlight: false },
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            {t('pricing.heading')}
          </h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            {t('pricing.sub')}
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-14">
          {/* Free */}
          <div className="bg-surface border border-border rounded-card p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{t('pricing.free_tier')}</p>
              <p className="text-lg font-black text-white mb-4">{t('pricing.free_name')}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-white/30 text-sm mb-2">{t('pricing.free_period')}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                  <Check className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                  {f}
                </li>
              ))}
              {FREE_MISSING.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/30">
                  <X className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button className="w-full border border-border text-white/50 font-semibold py-3 rounded-full text-sm">
              {t('pricing.free_cta')}
            </button>
          </div>

          {/* Pro */}
          <div className="relative bg-surface border-2 border-accent/40 rounded-card p-7 flex flex-col overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

            <div className="relative mb-6">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-accent uppercase tracking-widest">{t('pricing.pro_tier')}</p>
                <span className="flex items-center gap-1 text-[10px] font-black tracking-widest bg-accent text-white rounded-full px-2.5 py-1 uppercase">
                  <Zap className="w-2.5 h-2.5" />
                  {t('pricing.pro_badge')}
                </span>
              </div>
              <p className="text-lg font-black text-white mb-4">{t('pricing.pro_name')}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white">$12</span>
                <span className="text-white/30 text-sm mb-2">{t('pricing.pro_period')}</span>
              </div>
            </div>

            <ul className="relative space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button className="relative w-full bg-accent hover:bg-accent-light text-white font-bold py-3 rounded-full text-sm transition-colors shadow-lg shadow-accent/20">
              {t('pricing.pro_cta')}
            </button>
          </div>
        </div>

        {/* Feature table */}
        <div>
          <div className="mb-5">
            <h2 className="text-sm font-black text-white">{t('pricing.table_title')}</h2>
            <p className="text-xs text-white/30">{t('pricing.table_sub')}</p>
          </div>

          <div className="bg-surface border border-border rounded-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_120px] px-6 py-3 border-b border-border">
              <span className="text-xs text-white/40 font-semibold uppercase tracking-widest">{t('pricing.col_feature')}</span>
              <span className="text-xs text-white/40 font-semibold uppercase tracking-widest text-center">{t('pricing.col_free')}</span>
              <span className="text-xs text-accent font-semibold uppercase tracking-widest text-center">{t('pricing.col_pro')}</span>
            </div>

            {TABLE_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_120px_120px] px-6 py-4 items-center ${
                  i !== TABLE_ROWS.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <span className="text-sm text-white/60">{row.label}</span>
                <span className="text-sm text-white/40 text-center">{row.free}</span>
                <span className={`text-sm text-center font-semibold ${row.proHighlight ? 'text-accent' : 'text-white/70'}`}>
                  {row.pro}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-10">
          {t('pricing.powered')}
        </p>
      </main>

      {/* Right sidebar */}
      <div className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <div className="bg-surface-2 border border-border rounded-l-xl px-2 py-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            {t('pricing.sidebar')}
          </p>
        </div>
      </div>
    </>
  )
}
