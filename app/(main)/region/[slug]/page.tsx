import { Metadata } from 'next'

const REGION_INFO: Record<string, { name: string; description: string }> = {
  seoul: { name: '서울', description: '대한민국 수도 서울의 여행 정보' },
  busan: { name: '부산', description: '바다와 음식의 도시 부산 여행 가이드' },
  jeju: { name: '제주', description: '제주도 완벽 여행 가이드' },
  gyeongju: { name: '경주', description: '역사와 문화의 도시 경주 여행' },
  gangneung: { name: '강릉', description: '동해와 커피의 도시 강릉 여행' },
  jeonju: { name: '전주', description: '한옥마을과 맛의 도시 전주 여행' },
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const region = REGION_INFO[params.slug]
  if (!region) return { title: '지역 여행 정보' }
  return {
    title: `${region.name} 여행 가이드`,
    description: region.description,
  }
}

export default function RegionPage({ params }: { params: { slug: string } }) {
  const region = REGION_INFO[params.slug]
  const name = region?.name ?? params.slug

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">{name} 여행 가이드</h1>
      <p className="text-gray-500 mb-12">{region?.description}</p>
      <div className="text-gray-400 text-center py-24">
        {name} 여행 정보를 준비 중입니다 ✈️
      </div>
    </div>
  )
}
