import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'PICKVOLT 개인정보처리방침입니다. 수집하는 정보, 이용 목적, 보관 기간 등을 안내합니다.',
  alternates: { canonical: 'https://pickvolt.com/privacy' },
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = '2026년 7월 10일'
const SITE_NAME = 'PICKVOLT'
const SITE_URL = 'https://pickvolt.com'
const CONTACT_EMAIL = 'admin@djcjbch.org'

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20">

        <div className="mb-12">
          <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#3B9FDE] mb-4">법적 고지</p>
          <h1 className="text-[30px] font-bold text-[#1A2535] tracking-tight mb-3">
            개인정보처리방침
          </h1>
          <p className="text-[16px] text-[#6A8AA8]">시행일: {EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-10 text-[#4A5568]">

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">1. 총칙</h2>
            <p className="text-[16px] leading-relaxed">
              {SITE_NAME}({SITE_URL}, 이하 "사이트")는 이용자의 개인정보를 소중히 여기며,
              「개인정보 보호법」을 준수합니다.
              본 방침은 사이트가 수집하는 정보의 종류, 이용 목적, 보관 방식 및 이용자의 권리를 설명합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">2. 수집하는 정보</h2>
            <p className="text-[16px] leading-relaxed mb-4">
              사이트는 다음과 같은 정보를 수집할 수 있습니다.
            </p>
            <ul className="space-y-3 list-none">
              <li className="text-[16px] leading-relaxed pl-4 border-l-2 border-[#A8BED4]">
                <strong className="text-[#1A2535]">자동 수집 정보:</strong> 방문 IP 주소, 브라우저 종류, 방문 페이지, 방문 시각, 유입 경로 등 웹 서버 로그 데이터
              </li>
              <li className="text-[16px] leading-relaxed pl-4 border-l-2 border-[#A8BED4]">
                <strong className="text-[#1A2535]">쿠키 및 유사 기술:</strong> Google Analytics, Google AdSense 등 제3자 서비스가 쿠키를 통해 수집하는 정보
              </li>
              <li className="text-[16px] leading-relaxed pl-4 border-l-2 border-[#A8BED4]">
                <strong className="text-[#1A2535]">문의 시 수집 정보:</strong> 문의하기 양식 이용 시 입력한 이름(선택), 이메일 주소(필수), 문의 내용
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">3. 개인정보 수집 및 이용 목적</h2>
            <ul className="space-y-2 list-none">
              {[
                '사이트 방문 통계 분석 및 서비스 개선',
                '이용자 문의에 대한 답변 및 처리',
                '맞춤형 광고 제공 (Google AdSense)',
                '법적 의무 이행',
              ].map((item, i) => (
                <li key={i} className="text-[16px] leading-relaxed flex gap-2">
                  <span className="text-[#3B9FDE] font-bold shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">4. 제3자 서비스 및 쿠키</h2>
            <p className="text-[16px] leading-relaxed mb-4">
              사이트는 다음 제3자 서비스를 이용하며, 각 서비스는 자체 개인정보처리방침을 따릅니다.
            </p>
            <ul className="space-y-4 list-none">
              <li className="text-[16px] leading-relaxed">
                <strong className="text-[#1A2535] block mb-1">Google Analytics</strong>
                사이트 트래픽 및 이용자 행동 분석에 사용합니다. 브라우저 설정에서 쿠키를 거부하거나
                Google Analytics 옵트아웃 도구를 이용할 수 있습니다.
              </li>
              <li className="text-[16px] leading-relaxed">
                <strong className="text-[#1A2535] block mb-1">Google AdSense</strong>
                광고 게재 및 맞춤화에 사용합니다. Google은 사이트 방문자에게 관심 기반 광고를 표시하기 위해
                쿠키를 사용할 수 있습니다. 맞춤 광고는 Google 광고 설정 페이지에서 거부할 수 있습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">5. 개인정보 보관 및 파기</h2>
            <p className="text-[16px] leading-relaxed">
              문의를 통해 수집한 개인정보는 문의 처리 완료 후 1년 이내에 파기합니다.
              단, 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.
              서버 로그는 최대 90일간 보관 후 자동 삭제됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">6. 이용자의 권리</h2>
            <p className="text-[16px] leading-relaxed mb-4">
              이용자는 다음 권리를 행사할 수 있습니다.
            </p>
            <ul className="space-y-2 list-none">
              {[
                '개인정보 열람 요청',
                '개인정보 정정·삭제 요청',
                '개인정보 처리 정지 요청',
                '개인정보 이용·제공 동의 철회',
              ].map((item, i) => (
                <li key={i} className="text-[16px] leading-relaxed flex gap-2">
                  <span className="text-[#3B9FDE] font-bold shrink-0">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[16px] leading-relaxed mt-4">
              권리 행사는 아래 연락처로 요청하시면 지체 없이 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">7. 개인정보 보호 책임자</h2>
            <div className="text-[16px] leading-relaxed space-y-1">
              <p><strong className="text-[#1A2535]">사이트명:</strong> {SITE_NAME}</p>
              <p><strong className="text-[#1A2535]">이메일:</strong> {CONTACT_EMAIL}</p>
            </div>
          </section>

          <section>
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">8. 방침 변경 안내</h2>
            <p className="text-[16px] leading-relaxed">
              본 개인정보처리방침은 법령 개정 또는 서비스 변경에 따라 업데이트될 수 있습니다.
              변경 시 사이트 내 공지를 통해 안내하며, 변경된 방침은 공지 후 7일이 지나면 효력이 발생합니다.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
