import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '문의하기',
  description: 'PICKVOLT에 대한 문의, 제보, 협업 요청을 보내주세요. 빠르게 답변 드립니다.',
  alternates: { canonical: 'https://pickvolt.com/contact' },
}

const CONTACT_EMAIL = 'admin@djcjbch.org'

export default function ContactPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20">

        <div className="mb-12">
          <p className="text-[12px] font-semibold tracking-[0.22em] uppercase text-[#3B9FDE] mb-4">Contact</p>
          <h1 className="text-[30px] font-bold text-[#1A2535] tracking-tight mb-4">
            문의하기
          </h1>
          <p className="text-[16px] text-[#6A8AA8] leading-relaxed">
            콘텐츠 관련 제보, 오류 신고, 협업 문의는 아래 이메일로 연락 주세요.
            일반적으로 2~3 영업일 내에 답변 드립니다.
          </p>
        </div>

        <div className="space-y-8">

          <div className="border border-gray-100 rounded-sm p-8">
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-6">이메일로 문의</h2>

            <div className="mb-8">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-3 text-[20px] font-semibold text-[#3B9FDE] hover:underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="space-y-4">
              <h3 className="text-[16px] font-semibold text-[#1A2535]">문의 시 포함하면 좋은 내용</h3>
              <ul className="space-y-2 list-none">
                {[
                  '문의 유형 (콘텐츠 제보 / 오류 신고 / 협업 / 기타)',
                  '관련 페이지 URL (오류 신고 시)',
                  '구체적인 내용',
                ].map((item, i) => (
                  <li key={i} className="text-[16px] text-[#6A8AA8] leading-relaxed flex gap-2">
                    <span className="text-[#A8BED4] shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-gray-100 rounded-sm p-8">
            <h2 className="text-[20px] font-bold text-[#1A2535] mb-4">자주 묻는 질문</h2>
            <div className="space-y-6">
              {[
                {
                  q: '콘텐츠 협업이나 광고 문의는 어떻게 하나요?',
                  a: '이메일로 사이트 소개, 제안 내용, 담당자 연락처를 함께 보내주세요. 모든 문의는 검토 후 개별 안내해 드립니다.',
                },
                {
                  q: '잘못된 정보를 발견했어요.',
                  a: '해당 페이지 URL과 오류 내용을 이메일로 제보해 주세요. 빠르게 확인하고 수정하겠습니다.',
                },
                {
                  q: '게재된 사진 저작권 관련 문의는요?',
                  a: '저작권 관련 문제는 이메일로 연락 주시면 즉시 처리합니다.',
                },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[16px] font-semibold text-[#1A2535] mb-2">{item.q}</p>
                  <p className="text-[16px] text-[#6A8AA8] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
