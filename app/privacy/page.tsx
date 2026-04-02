import Navbar from '@/components/Navbar'

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">개인정보처리방침</h1>
          <p className="text-xs text-white/30 mb-10">최종 수정일: 2024년 1월 1일</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">1. 수집하는 정보</h2>
              <p>Pickvolt는 서비스 제공을 위해 다음과 같은 정보를 수집합니다:</p>
              <ul className="mt-3 space-y-1.5 list-disc list-inside text-white/50">
                <li>Google OAuth를 통한 이메일 주소 및 프로필 사진</li>
                <li>제품 비교 기록 및 사용자 설정</li>
                <li>쿠키 및 로컬 스토리지 데이터 (언어, 통화 설정)</li>
                <li>서비스 이용 통계 (익명화된 데이터)</li>
              </ul>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">2. 정보 이용 목적</h2>
              <p>수집된 정보는 다음 목적으로 사용됩니다: 서비스 제공 및 개인화, 비교 기록 저장, Pro 구독 관리, 서비스 개선 및 통계 분석.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">3. 제3자 공유</h2>
              <p>Pickvolt는 다음 서비스 제공업체와 데이터를 공유합니다: Supabase (데이터베이스), Google (인증), Polar.sh (결제), Vercel (호스팅). 이들은 서비스 제공 목적으로만 데이터에 접근합니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">4. 데이터 보관</h2>
              <p>무료 플랜은 30일, Pro 플랜은 무제한으로 비교 기록을 보관합니다. 계정 삭제 시 모든 데이터는 즉시 삭제됩니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">5. 문의</h2>
              <p>개인정보 관련 문의는 privacy@pickvolt.com으로 연락 주세요.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
