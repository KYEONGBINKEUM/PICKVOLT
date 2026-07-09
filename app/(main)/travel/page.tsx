import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '전체 여행 정보',
  description: '국내 여행지별 코스, 맛집, 숙소 정보를 모아봤습니다.',
}

export default function TravelListPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">전체 여행 정보</h1>
      <p className="text-gray-500 mb-12">국내 여행지별 코스, 맛집, 숙소를 정리했습니다.</p>
      <div className="text-gray-400 text-center py-24">
        글을 준비 중입니다 ✈️
      </div>
    </div>
  )
}
