import Navbar from '@/components/Navbar'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">Terms of Service</h1>
          <p className="text-xs text-white/30 mb-10">Last updated: January 1, 2024</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">1. Use of Service</h2>
              <p>By using Pickvolt, you agree to these terms. The service is available for personal, non-commercial use only. AI recommendations are for reference purposes — final purchasing decisions are your own responsibility.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">2. Accounts</h2>
              <p>You can sign up using your Google account. You are responsible for maintaining the security of your account credentials. Accounts may be suspended for providing false information or misusing the service.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">3. Pro Subscription</h2>
              <p>The Pro plan is billed on a monthly basis. Upon cancellation, Pro features remain available until the end of the current billing period. Refunds may be requested within 7 days of subscription start.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">4. Disclaimer</h2>
              <p>Pickvolt&apos;s AI recommendations are data-driven reference information. We do not guarantee the accuracy of our service and are not liable for any damages resulting from its use.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">5. Service Changes</h2>
              <p>Pickvolt reserves the right to modify or discontinue the service without prior notice. Significant changes will be communicated via email.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
