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
  routine_id: string | null  // 루틴 ID (루틴으로 생성된 경우)
}

// 루틴 테이블 타입 정의
export interface Routine {
  id: string
  workspace_id: string
  user_id: string
  created_at: string
  title: string
  summary: string | null
  expression: string | null
  start_at: string  // TIME 타입 (HH:MM:SS)
  end_at: string | null  // TIME 타입 (HH:MM:SS)
  repeat_days: number[]  // [0,1,2,3,4,5,6] - 0=일요일, 6=토요일
  is_active: boolean
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

// ============================================
// 루틴 관련 함수들
// ============================================

// 루틴 조회 함수 (워크스페이스별)
export const getRoutinesByWorkspace = async (workspaceId: string, userId: string) => {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching routines:', error)
    throw error
  }

  return data as Routine[]
}

// 루틴 생성 함수
export const createRoutine = async (routine: Omit<Routine, 'id' | 'created_at' | 'is_active'>) => {
  const { data, error } = await supabase
    .from('routines')
    .insert({ ...routine, is_active: true })
    .select()
    .single()

  if (error) {
    console.error('Error creating routine:', error)
    throw error
  }

  return data as Routine
}

// 루틴 수정 함수
export const updateRoutine = async (routineId: string, userId: string, updates: Partial<Routine>) => {
  const { data, error } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', routineId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating routine:', error)
    throw error
  }

  return data as Routine
}

// 루틴 삭제 함수
export const deleteRoutine = async (routineId: string, userId: string) => {
  // 먼저 관련된 SoD들의 routine_id를 null로 설정
  await supabase
    .from('sods')
    .update({ routine_id: null })
    .eq('routine_id', routineId)
    .eq('user_id', userId)

  // 루틴 삭제
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting routine:', error)
    throw error
  }
}

// 특정 월에 루틴 적용하기 (SoD 생성 - 오늘부터 월말까지)
export const applyRoutineToMonth = async (
  routine: Routine,
  year: number,
  month: number,
  workspaceId: string,
  userId: string
) => {
  // 오늘 날짜
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const sodsToCreate: Omit<Sod, 'id' | 'created_at'>[] = []
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    
    // 오늘 이전 날짜는 건너뛰기
    if (date < today) {
      continue
    }
    
    const dayOfWeek = date.getDay()
    
    // 선택된 요일인 경우
    if (routine.repeat_days.includes(dayOfWeek)) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      // Summary에 (루틴) 접두어 추가
      const summaryText = routine.summary ? `(루틴) ${routine.summary}` : '(루틴)'
      
      sodsToCreate.push({
        workspace_id: workspaceId,
        user_id: userId,
        date: dateStr,
        start_at: routine.start_at,
        end_at: routine.end_at,
        summary: summaryText,
        expression: routine.expression,
        routine_id: routine.id,
        check: false
      })
    }
  }
  
  if (sodsToCreate.length > 0) {
    const { error } = await supabase
      .from('sods')
      .insert(sodsToCreate)
    
    if (error) {
      console.error('Error applying routine to month:', error)
      throw error
    }
  }
  
  return sodsToCreate.length
}

// 특정 월에서 루틴 해제하기 (해당 루틴으로 생성된 SoD 삭제 - 미래 날짜만)
export const removeRoutineFromMonth = async (
  routineId: string,
  year: number,
  month: number,
  workspaceId: string,
  userId: string
) => {
  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // 오늘보다 이후 날짜 계산 (내일부터)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  
  const { error } = await supabase
    .from('sods')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('routine_id', routineId)
    .gte('date', tomorrowStr)  // 내일 이후 날짜만 삭제
    .lte('date', endDate)
  
  if (error) {
    console.error('Error removing routine from month:', error)
    throw error
  }
}
