import { NextRequest, NextResponse } from 'next/server'
import { getUserData, getUserById } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (userId) {
      const user = await getUserById(userId)
      return NextResponse.json({ user })
    } else {
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