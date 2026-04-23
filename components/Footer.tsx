'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border pt-10 pb-20 lg:pb-10 mt-auto">
      <div className="max-w-inner mx-auto px-6 flex flex-col items-center gap-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="font-bold text-white">pickvolt</span>
        </Link>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white/30">
          <Link href="/about"   className="hover:text-white transition-colors">{t('footer.about')}</Link>
          <Link href="/contact" className="hover:text-white transition-colors">{t('footer.contact')}</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">{t('footer.privacy')}</Link>
          <Link href="/terms"   className="hover:text-white transition-colors">{t('footer.terms')}</Link>
          <Link href="/cookies" className="hover:text-white transition-colors">{t('footer.cookies')}</Link>
        </div>

        {/* Copyright */}
        <p className="text-xs text-white/20 text-center">
          © 2026 Pickvolt, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
