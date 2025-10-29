import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 유저 테이블 타입 정의
export interface User {
  id: string
  email: string
  created_at: string
}

// 유저 데이터 조회 함수들
export const getUserData = async () => {
  console.log('Fetching users from Supabase...')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('Supabase response:', { data, error })

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

  console.log('Returning data:', data)
  return data as User[]
}

export const getUserById = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    throw error
  }

  return data as User
}
