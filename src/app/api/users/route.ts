import { NextRequest, NextResponse } from 'next/server'
import { getUserData, getUserById } from '@/lib/supabase'

// 모든 유저 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (userId) {
      // 특정 유저 조회
      const user = await getUserById(userId)
      return NextResponse.json({ user })
    } else {
      // 모든 유저 조회
      const users = await getUserData()
      return NextResponse.json({ users })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}