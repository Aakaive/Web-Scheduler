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

// 리마인더 테이블 타입 정의
export interface Reminder {
  id: string
  summary: string
  created_at: string
  start: string
  end: string
  expression: string | null
  user_id: string
  workspace_id: string
  google_event_id: string | null
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

// 리마인더 데이터 조회 함수
export const getRemindersByWorkspace = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reminders:', error)
    throw error
  }

  return data as Reminder[]
}

// 리마인더 추가 함수
export const createReminder = async (reminder: Omit<Reminder, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('reminders')
    .insert(reminder)
    .select()
    .single()

  if (error) {
    console.error('Error creating reminder:', error)
    throw error
  }

  return data as Reminder
}

// 리마인더 삭제 함수
export const deleteReminder = async (reminderId: string, userId: string) => {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting reminder:', error)
    throw error
  }
}
