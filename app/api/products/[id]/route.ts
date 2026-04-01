import { NextRequest, NextResponse } from 'next/server'
import { fetchProductDetail } from '@/lib/techspecs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await fetchProductDetail(id)

  if (!product) {
    return NextResponse.json({ error: '제품을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json(product)
}
