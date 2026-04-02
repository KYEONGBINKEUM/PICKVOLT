import Navbar from '@/components/Navbar'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">Privacy Policy</h1>
          <p className="text-xs text-white/30 mb-10">Last updated: January 1, 2024</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">1. Information We Collect</h2>
              <p>Pickvolt collects the following information to provide our services:</p>
              <ul className="mt-3 space-y-1.5 list-disc list-inside text-white/50">
                <li>Email address and profile photo via Google OAuth</li>
                <li>Product comparison history and user preferences</li>
                <li>Cookie and local storage data (language, currency settings)</li>
                <li>Anonymous usage statistics to improve our service</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">2. How We Use Your Information</h2>
              <p>Collected information is used for: providing and personalizing our service, storing comparison history, managing Pro subscriptions, and improving the product through analytics.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">3. Third-Party Services</h2>
              <p>Pickvolt shares data with the following service providers: Supabase (database), Google (authentication), Polar.sh (payments), and Vercel (hosting). These providers access your data solely to deliver the services we use.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">4. Data Retention</h2>
              <p>Comparison history is retained for 30 days on the Free plan and indefinitely on the Pro plan. All data is permanently deleted upon account deletion.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">5. Contact</h2>
              <p>For privacy-related inquiries, please contact us at privacy@pickvolt.com.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
