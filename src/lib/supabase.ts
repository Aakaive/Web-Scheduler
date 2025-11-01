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

// SoD 테이블 타입 정의
export interface Sod {
  id: string
  workspace_id: string
  user_id: string
  created_at: string
  date: string  // DATE 타입 (YYYY-MM-DD)
  start_at: string | null  // TIME 타입 (HH:MM:SS)
  end_at: string | null  // TIME 타입 (HH:MM:SS)
  summary: string | null  // TEXT
  expression: string | null  // TEXT
  check: boolean  // BOOLEAN, default false
}

// SoD 데이터 조회 함수 (날짜별)
export const getSodsByDate = async (workspaceId: string, userId: string, date: string) => {
  const { data, error } = await supabase
    .from('sods')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('date', date)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Error fetching SODs:', error)
    throw error
  }

  return data as Sod[]
}

// SoD 추가 함수
export const createSod = async (sod: Omit<Sod, 'id' | 'created_at' | 'check'>) => {
  const { data, error } = await supabase
    .from('sods')
    .insert({ ...sod, check: false })
    .select()
    .single()

  if (error) {
    console.error('Error creating SOD:', error)
    throw error
  }

  return data as Sod
}

// SoD 업데이트 함수 (체크박스 등)
export const updateSod = async (sodId: string, userId: string, updates: Partial<Sod>) => {
  const { data, error } = await supabase
    .from('sods')
    .update(updates)
    .eq('id', sodId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating SOD:', error)
    throw error
  }

  return data as Sod
}

// SoD 삭제 함수
export const deleteSod = async (sodId: string, userId: string) => {
  const { error } = await supabase
    .from('sods')
    .delete()
    .eq('id', sodId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting SOD:', error)
    throw error
  }
}

// SoD 범위 조회 (월 단위 통계 계산용)
export const getSodsInRange = async (
  workspaceId: string,
  userId: string,
  startDateInclusive: string, // 'YYYY-MM-DD'
  endDateInclusive: string // 'YYYY-MM-DD'
) => {
  const { data, error } = await supabase
    .from('sods')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .gte('date', startDateInclusive)
    .lte('date', endDateInclusive)
    .order('date', { ascending: true })
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Error fetching SODs in range:', error)
    throw error
  }

  return data as Sod[]
}

// ToDo 테이블 타입 정의
export interface Todo {
  id: string
  workspace_id: string
  user_id: string
  created_at: string
  is_pinned: boolean
  pinned_at: string | null
  upped_at: string | null
  summary: string
  expression: string | null
  completed: boolean
}

// ToDo 데이터 조회 함수 (정렬: pinned > upped_at > created_at)
export const getTodosByWorkspace = async (workspaceId: string) => {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('is_pinned', { ascending: false })
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('upped_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching todos:', error)
    throw error
  }

  return data as Todo[]
}

// ToDo 추가 함수
export const createTodo = async (todo: Omit<Todo, 'id' | 'created_at' | 'completed' | 'is_pinned' | 'pinned_at' | 'upped_at'>) => {
  const { data, error } = await supabase
    .from('todos')
    .insert({ 
      ...todo, 
      completed: false,
      is_pinned: false,
      pinned_at: null,
      upped_at: null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating todo:', error)
    throw error
  }

  return data as Todo
}

// ToDo 업데이트 함수
export const updateTodo = async (todoId: string, userId: string, updates: Partial<Todo>) => {
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating todo:', error)
    throw error
  }

  return data as Todo
}

// ToDo 삭제 함수
export const deleteTodo = async (todoId: string, userId: string) => {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting todo:', error)
    throw error
  }
}

// ToDo Pin 토글 함수
export const toggleTodoPin = async (todoId: string, userId: string, isPinned: boolean) => {
  const updates: Partial<Todo> = {
    is_pinned: isPinned,
    pinned_at: isPinned ? new Date().toISOString() : null
  }
  
  return updateTodo(todoId, userId, updates)
}

// ToDo Up 함수 (upped_at 업데이트)
export const upTodo = async (todoId: string, userId: string) => {
  const updates: Partial<Todo> = {
    upped_at: new Date().toISOString()
  }
  
  return updateTodo(todoId, userId, updates)
}

// Google OAuth 토큰 갱신 함수
export const getRefreshedGoogleToken = async (): Promise<string | null> => {
  try {
    // Supabase 세션을 가져오면 자동으로 토큰이 갱신됨
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    if (!data.session) {
      console.warn('No active session found')
      return null
    }
    
    // provider_token이 갱신되었을 수 있으므로 localStorage에 업데이트
    if (data.session.provider_token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('google_provider_token', data.session.provider_token)
      }
      return data.session.provider_token
    }
    
    console.warn('No provider_token in session')
    return null
  } catch (err) {
    console.error('Failed to refresh Google token:', err)
    return null
  }
}
