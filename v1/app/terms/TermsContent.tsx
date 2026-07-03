'use client'

import { useI18n } from '@/lib/i18n'

export default function TermsContent() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('terms.label')}</p>
      <h1 className="text-4xl font-black text-white mb-2">{t('terms.title')}</h1>
      <p className="text-xs text-white/30 mb-10">{t('terms.updated')}</p>

      <div className="space-y-8 text-sm text-white/60 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('terms.s1_title')}</h2>
          <p>{t('terms.s1_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('terms.s2_title')}</h2>
          <p>{t('terms.s2_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('terms.s3_title')}</h2>
          <p>{t('terms.s3_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('terms.s4_title')}</h2>
          <p>{t('terms.s4_body')}</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-3">{t('terms.s5_title')}</h2>
          <p>{t('terms.s5_body')}</p>
        </section>
      </div>
    </div>
  )
}
