import Navbar from '@/components/Navbar'

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-10 px-6 max-w-inner mx-auto">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">legal</p>
          <h1 className="text-4xl font-black text-white mb-2">쿠키 정책</h1>
          <p className="text-xs text-white/30 mb-10">최종 수정일: 2024년 1월 1일</p>

          <div className="space-y-8 text-sm text-white/60 leading-relaxed">
            <section>
              <h2 className="text-base font-bold text-white mb-3">쿠키란?</h2>
              <p>쿠키는 웹사이트 방문 시 브라우저에 저장되는 작은 텍스트 파일입니다. Pickvolt는 더 나은 사용 경험을 위해 쿠키를 사용합니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">사용하는 쿠키 유형</h2>
              <div className="space-y-4">
                {[
                  { type: '필수 쿠키', desc: '로그인 세션 유지, 서비스 기본 기능에 필요합니다. 거부할 수 없습니다.', required: true },
                  { type: '기능성 쿠키', desc: '언어, 통화 설정 등 사용자 환경 설정을 기억합니다.', required: false },
                  { type: '분석 쿠키', desc: '서비스 개선을 위한 익명 사용 통계를 수집합니다.', required: false },
                ].map((c) => (
                  <div key={c.type} className="flex items-start justify-between gap-4 p-4 bg-surface border border-border rounded-card">
                    <div>
                      <p className="text-sm font-bold text-white mb-1">{c.type}</p>
                      <p className="text-xs text-white/40">{c.desc}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      c.required ? 'bg-white/10 text-white/50' : 'bg-accent/10 text-accent'
                    }`}>
                      {c.required ? '필수' : '선택'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">쿠키 관리</h2>
              <p>브라우저 설정에서 쿠키를 비활성화할 수 있습니다. 단, 필수 쿠키를 비활성화하면 일부 기능이 제한될 수 있습니다.</p>
            </section>
            <section>
              <h2 className="text-base font-bold text-white mb-3">로컬 스토리지</h2>
              <p>언어(pv_locale), 통화(pv_currency), 쿠키 동의(pv_cookie_consent) 설정은 브라우저 로컬 스토리지에 저장됩니다. 브라우저 설정에서 직접 삭제할 수 있습니다.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
