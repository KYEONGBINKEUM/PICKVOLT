'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { Send, Check } from 'lucide-react'

export default function ContactContent() {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !subject.trim() || !body.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, body }),
      })
      if (!res.ok) throw new Error('failed')
      setSubmitted(true)
    } catch {
      setError(t('contact.form_error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t('contact.label')}</p>
      <h1 className="text-4xl font-black text-white mb-2">{t('contact.title')}</h1>
      <p className="text-sm text-white/40 mb-10">{t('contact.subtitle')}</p>

      {submitted ? (
        <div className="bg-surface border border-green-500/30 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-white font-bold">{t('contact.form_success_title')}</p>
          <p className="text-sm text-white/50">{t('contact.form_success_body')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">{t('contact.form_name')} *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50 transition-colors"
                placeholder={t('contact.form_name_placeholder')}
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">{t('contact.form_email')} *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">{t('contact.form_subject')} *</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50 transition-colors"
              placeholder={t('contact.form_subject_placeholder')}
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">{t('contact.form_body')} *</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              required
              rows={5}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50 transition-colors resize-none"
              placeholder={t('contact.form_body_placeholder')}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? t('contact.form_submitting') : t('contact.form_submit')}
          </button>
        </form>
      )}

      <div className="mt-6 rounded-xl border border-border p-5 space-y-3">
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
  )
}
