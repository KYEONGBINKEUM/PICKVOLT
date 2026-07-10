import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '소개',
  description: 'PICKVOLT는 여행 장소 추천, 호텔 추천, 여행 소식을 전달하는 국내 여행 미디어입니다.',
  alternates: { canonical: 'https://pickvolt.com/about' },
}

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20">

        <div className="mb-12">
          <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#3B9FDE] mb-4">소개</p>
          <h1 className="text-[30px] font-bold text-[#1A2535] tracking-tight mb-6">
            PICKVOLT에 대해
          </h1>
          <p className="text-[16px] text-[#6A8AA8] leading-relaxed">
            PICKVOLT는 여행을 좋아하는 사람이 만드는 여행 미디어입니다.
          </p>
        </div>

        <div className="space-y-10 text-[#1A2535]">

          <section>
            <h2 className="text-[20px] font-bold mb-4 text-[#1A2535]">어떤 콘텐츠를 만드나요?</h2>
            <p className="text-[16px] text-[#4A5568] leading-relaxed mb-4">
              PICKVOLT는 크게 세 가지 콘텐츠를 다룹니다.
            </p>
            <ul className="space-y-3 list-none">
              <li className="flex gap-3 text-[16px] text-[#4A5568] leading-relaxed">
                <span className="font-semibold text-[#3B9FDE] shrink-0">여행 장소 추천</span>
                <span>국내외 여행지 명소와 숨겨진 스팟을 직접 조사해 추천합니다.</span>
              </li>
              <li className="flex gap-3 text-[16px] text-[#4A5568] leading-relaxed">
                <span className="font-semibold text-[#3B9FDE] shrink-0">호텔 추천</span>
                <span>가성비부터 럭셔리까지, 지역별 숙소를 비교하고 솔직하게 평가합니다.</span>
              </li>
              <li className="flex gap-3 text-[16px] text-[#4A5568] leading-relaxed">
                <span className="font-semibold text-[#3B9FDE] shrink-0">여행 소식</span>
                <span>새로 열린 관광지, 시즌 축제, 항공·숙박 할인 정보를 빠르게 전달합니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-4 text-[#1A2535]">운영 원칙</h2>
            <p className="text-[16px] text-[#4A5568] leading-relaxed">
              PICKVOLT는 광고·협찬 여부와 관계없이 실제로 도움이 되는 정보만 담습니다.
              콘텐츠에 광고나 제휴 링크가 포함될 경우 해당 글에 명확히 표시합니다.
              수익은 사이트 운영과 더 좋은 콘텐츠 제작에 사용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-4 text-[#1A2535]">광고 및 제휴</h2>
            <p className="text-[16px] text-[#4A5568] leading-relaxed">
              PICKVOLT는 Google AdSense를 통한 광고를 게재합니다.
              광고는 Google이 자동으로 결정하며, 광고 내용에 대해 PICKVOLT는 책임을 지지 않습니다.
              광고 차단 또는 맞춤 광고 설정은 Google 광고 설정 페이지에서 조정할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-4 text-[#1A2535]">문의</h2>
            <p className="text-[16px] text-[#4A5568] leading-relaxed mb-4">
              콘텐츠 관련 제보, 협업 문의, 오류 신고는 문의하기 페이지를 이용해 주세요.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center text-[16px] font-semibold text-[#3B9FDE] hover:underline underline-offset-4"
            >
              문의하기
            </Link>
          </section>

          <section>
            <h2 className="text-[20px] font-bold mb-4 text-[#1A2535]">개인정보처리방침</h2>
            <p className="text-[16px] text-[#4A5568] leading-relaxed mb-4">
              수집하는 정보와 처리 방법에 대한 내용은 개인정보처리방침 페이지에서 확인할 수 있습니다.
            </p>
            <Link
              href="/privacy"
              className="inline-flex items-center text-[16px] font-semibold text-[#3B9FDE] hover:underline underline-offset-4"
            >
              개인정보처리방침 보기
            </Link>
          </section>

        </div>
      </div>
    </div>
  )
}
