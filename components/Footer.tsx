'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer style={{ background: '#000', marginTop: 80, padding: '48px 0' }}>
      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '0 20px' }}>
        {/* Logo */}
        <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', marginBottom: 6 }}>
          Pickvolt<span style={{ color: '#FF4D00' }}>.</span>
        </p>

        {/* Description */}
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: 440 }}>
          {t('footer.desc')}
        </p>

        {/* Links */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap' }} className="pv-footer-links">
          <Link href="/about"   style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }} className="pv-footer-link">{t('footer.about')}</Link>
          <Link href="/contact" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }} className="pv-footer-link">{t('footer.ad_contact')}</Link>
          <Link href="/contact" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }} className="pv-footer-link">{t('footer.contact')}</Link>
          <Link href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }} className="pv-footer-link">{t('footer.privacy')}</Link>
          <Link href="/terms"   style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }} className="pv-footer-link">{t('footer.terms')}</Link>
        </div>

        {/* Copyright */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginTop: 10 }}>
          {t('footer.copy')}
        </p>
      </div>

      <style>{`
        .pv-footer-link:hover { color: #fff !important; }
      `}</style>
    </footer>
  )
}
