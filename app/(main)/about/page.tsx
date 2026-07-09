import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '소개',
  description: 'PICKVOLT는 직접 경험한 여행 정보만 소개하는 여행 가이드입니다.',
}

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">PICKVOLT 소개</h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 leading-relaxed mb-6">
          PICKVOLT는 직접 가보고, 직접 먹어보고, 직접 자본 경험을 바탕으로
          여행 정보를 소개하는 여행 가이드입니다.
        </p>
        <p className="text-gray-600 leading-relaxed mb-6">
          인터넷에 넘치는 복붙 여행 정보가 아닌,
          실제 경험에 기반한 솔직한 정보를 제공하는 것을 목표로 합니다.
        </p>
        <h2 className="text-xl font-bold mt-10 mb-4">문의</h2>
        <p className="text-gray-600">
          비즈니스 문의: contact@pickvolt.com
        </p>
      </div>
    </div>
  )
}
