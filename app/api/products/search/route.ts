import { NextResponse } from 'next/server'

// TODO: 자체 DB 연동 예정
export async function GET() {
  return NextResponse.json({ results: [], total: 0 })
}
