import Navbar from '@/components/Navbar'

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">Cookie Policy</h1>
          <p className="text-xs text-white/30 mb-10">Last updated: January 1, 2024</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">What Are Cookies?</h2>
              <p>Cookies are small text files stored in your browser when you visit a website. Pickvolt uses cookies to provide a better user experience.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">Types of Cookies We Use</h2>
              <div className="space-y-4">
                {[
                  { type: 'Essential Cookies', desc: 'Required for login sessions and core service functionality. These cannot be disabled.', required: true },
                  { type: 'Functional Cookies', desc: 'Remember your preferences such as language and currency settings.', required: false },
                  { type: 'Analytics Cookies', desc: 'Collect anonymous usage statistics to help us improve the service.', required: false },
                ].map((c) => (
                  <div key={c.type} className="flex items-start justify-between gap-4 p-4 bg-surface border border-border rounded-card">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{c.type}</p>
                      <p className="text-xs text-white/40">{c.desc}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      c.required ? 'bg-white/10 text-white/50' : 'bg-accent/10 text-accent'
                    }`}>
                      {c.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">Managing Cookies</h2>
              <p>You can disable cookies in your browser settings. Note that disabling essential cookies may limit certain features of the service.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">Local Storage</h2>
              <p>Language (pv_locale), currency (pv_currency), and cookie consent (pv_cookie_consent) preferences are stored in your browser&apos;s local storage. You can clear these directly from your browser settings.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
