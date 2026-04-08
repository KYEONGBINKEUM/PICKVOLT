'use client'

import { Check } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useI18n } from '@/lib/i18n'

export default function PricingPage() {
  const { t } = useI18n()

  const features = [
    t('pricing.free_feat1'),
    t('pricing.free_feat2'),
    t('pricing.free_feat3'),
    t('pricing.free_feat4'),
    t('pricing.free_feat5'),
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-20 px-6 max-w-inner mx-auto">

        <div className="text-center mb-14">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
            {t('pricing.heading')}
          </h1>
          <p className="text-white/40 text-sm max-w-lg mx-auto leading-relaxed">
            {t('pricing.sub')}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-surface border border-border rounded-card p-8 flex flex-col items-center text-center">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">{t('pricing.free_tier')}</p>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-6xl font-black text-white">$0</span>
              <span className="text-white/30 text-sm mb-2">{t('pricing.free_period')}</span>
            </div>

            <ul className="space-y-3 mb-8 w-full text-left">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                  <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full border border-border text-white/30 font-semibold py-3 rounded-full text-sm cursor-default"
            >
              {t('pricing.free_cta')}
            </button>
          </div>

          <p className="text-center text-xs text-white/20 mt-6">{t('pricing.powered')}</p>
        </div>

      </main>
    </>
  )
}
