import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">이용약관</h1>
          <p className="text-xs text-white/30 mb-10">최종 수정일: 2024년 1월 1일</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">1. 서비스 이용</h2>
              <p>Pickvolt 서비스를 이용함으로써 본 약관에 동의하게 됩니다. 서비스는 개인적, 비상업적 목적으로만 이용 가능합니다. AI 추천은 참고용이며 최종 구매 결정은 사용자의 책임입니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">2. 계정</h2>
              <p>Google 계정을 통해 서비스에 가입할 수 있습니다. 계정 정보의 보안은 사용자 책임입니다. 허위 정보 제공 또는 서비스 악용 시 계정이 정지될 수 있습니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">3. Pro 구독</h2>
              <p>Pro 플랜은 월 구독제로 운영됩니다. 구독 취소 시 현재 청구 기간이 끝날 때까지 Pro 기능을 이용할 수 있습니다. 환불은 구독 시작 7일 이내 요청 가능합니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">4. 면책 조항</h2>
              <p>Pickvolt의 AI 추천은 데이터 기반 참고 정보입니다. 서비스의 정확성을 보장하지 않으며, 이용으로 인한 손해에 대해 책임을 지지 않습니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">5. 서비스 변경</h2>
              <p>Pickvolt는 사전 통보 없이 서비스를 변경하거나 중단할 권리를 보유합니다. 주요 변경 사항은 이메일로 공지됩니다.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
