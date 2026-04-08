'use client'

import { useI18n } from '@/lib/i18n'

export default function ContactContent() {
  const { t } = useI18n()

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('contact.label')}</p>
      <h1 className="text-4xl font-black text-white mb-2">{t('contact.title')}</h1>
      <p className="text-sm text-white/40 mb-10">{t('contact.subtitle')}</p>

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:vandalroof@gmail.com"
            className="group flex flex-col gap-1.5 rounded-xl border border-border p-5 hover:border-white/20 transition-colors"
          >
            <span className="text-xs text-white/30 uppercase tracking-widest">{t('contact.general_label')}</span>
            <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">vandalroof@gmail.com</span>
            <span className="text-xs text-white/40">{t('contact.general_desc')}</span>
          </a>

          <a
            href="mailto:vandalroof@gmail.com"
            className="group flex flex-col gap-1.5 rounded-xl border border-border p-5 hover:border-white/20 transition-colors"
          >
            <span className="text-xs text-white/30 uppercase tracking-widest">{t('contact.privacy_label')}</span>
            <span className="text-sm font-medium text-white group-hover:text-accent transition-colors">vandalroof@gmail.com</span>
            <span className="text-xs text-white/40">{t('contact.privacy_desc')}</span>
          </a>
        </div>

        <div className="rounded-xl border border-border p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">{t('contact.faq_title')}</h2>
          <ul className="space-y-2 text-sm text-white/50">
            <li>
              <span className="text-white/70">{t('contact.faq_product_title')}</span>
              {' '}{t('contact.faq_product_body')}
            </li>
            <li>
              <span className="text-white/70">{t('contact.faq_specs_title')}</span>
              {' '}{t('contact.faq_specs_body')}
            </li>
            <li>
              <span className="text-white/70">{t('contact.faq_billing_title')}</span>
              {' '}{t('contact.faq_billing_body')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
