import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  email: string
  created_at: string
}

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

export const getUserData = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

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

export interface Sod {
  id: string
  workspace_id: string
  user_id: string
  created_at: string
  date: string
  start_at: string | null
  end_at: string | null
  summary: string | null
  expression: string | null
  check: boolean
  routine_id: string | null
}

export interface Routine {
  id: string
  workspace_id: string
  user_id: string
  created_at: string
  title: string
  summary: string | null
  expression: string | null
  start_at: string
  end_at: string | null
  repeat_days: number[]
  is_active: boolean
}

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

  // If check status was updated, also update linked Todo
  if (updates.check !== undefined) {
    const { error: todoError } = await supabase
      .from('todos')
      .update({ completed: updates.check })
      .eq('sod_id', sodId)
      .eq('user_id', userId)
    
    if (todoError) {
      console.error('Error updating linked todo:', todoError)
    }
  }

  return data as Sod
}

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

export const getSodsInRange = async (
  workspaceId: string,
  userId: string,
  startDateInclusive: string,
  endDateInclusive: string
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
  sod_id: string | null
}

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

export const createTodo = async (todo: Omit<Todo, 'id' | 'created_at' | 'completed' | 'is_pinned' | 'pinned_at' | 'upped_at' | 'sod_id'>) => {
  const { data, error } = await supabase
    .from('todos')
    .insert({ 
      ...todo, 
      completed: false,
      is_pinned: false,
      pinned_at: null,
      upped_at: null,
      sod_id: null
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating todo:', error)
    throw error
  }

  return data as Todo
}

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

export const toggleTodoPin = async (todoId: string, userId: string, isPinned: boolean) => {
  const updates: Partial<Todo> = {
    is_pinned: isPinned,
    pinned_at: isPinned ? new Date().toISOString() : null
  }
  
  return updateTodo(todoId, userId, updates)
}

export const upTodo = async (todoId: string, userId: string) => {
  const updates: Partial<Todo> = {
    upped_at: new Date().toISOString()
  }
  
  return updateTodo(todoId, userId, updates)
}

export const createSodFromTodo = async (
  todoId: string,
  userId: string,
  workspaceId: string,
  date: string,
  startAt: string,
  endAt: string | null
) => {
  // First, get the todo
  const { data: todo, error: todoError } = await supabase
    .from('todos')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single()

  if (todoError || !todo) {
    console.error('Error fetching todo:', todoError)
    throw todoError || new Error('Todo not found')
  }

  // Create SOD from todo
  const sod = await createSod({
    workspace_id: workspaceId,
    user_id: userId,
    date,
    start_at: startAt,
    end_at: endAt,
    summary: todo.summary,
    expression: todo.expression,
    routine_id: null
  })

  // Update todo to link to the SOD
  await updateTodo(todoId, userId, { 
    sod_id: sod.id,
    completed: sod.check 
  })

  return sod
}

export const getRefreshedGoogleToken = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    if (!data.session) {
      return null
    }
    
    if (data.session.provider_token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('google_provider_token', data.session.provider_token)
      }
      return data.session.provider_token
    }
    
    return null
  } catch (err) {
    console.error('Failed to refresh Google token:', err)
    return null
  }
}

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

export const deleteRoutine = async (routineId: string, userId: string) => {
  await supabase
    .from('sods')
    .update({ routine_id: null })
    .eq('routine_id', routineId)
    .eq('user_id', userId)

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

export const applyRoutineToMonth = async (
  routine: Routine,
  year: number,
  month: number,
  workspaceId: string,
  userId: string
) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const sodsToCreate: Omit<Sod, 'id' | 'created_at'>[] = []
  
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    
    if (date < today) {
      continue
    }
    
    const dayOfWeek = date.getDay()
    
    if (routine.repeat_days.includes(dayOfWeek)) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
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

export const removeRoutineFromMonth = async (
  routineId: string,
  year: number,
  month: number,
  workspaceId: string,
  userId: string
) => {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
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
    .gte('date', tomorrowStr)
    .lte('date', endDate)
  
  if (error) {
    console.error('Error removing routine from month:', error)
    throw error
  }
}

export interface Comment {
  id: string
  workspace_id: string
  created_at: string
  expression: string
  date: string
}

export const getCommentByDate = async (workspaceId: string, date: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('date', date)
    .maybeSingle()

  if (error) {
    console.error('Error fetching comment:', error)
    throw error
  }

  return data as Comment | null
}

export const createComment = async (comment: Omit<Comment, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('comments')
    .insert(comment)
    .select()
    .single()

  if (error) {
    console.error('Error creating comment:', error)
    throw error
  }

  return data as Comment
}

export const updateComment = async (commentId: string, workspaceId: string, expression: string) => {
  const { data, error } = await supabase
    .from('comments')
    .update({ expression })
    .eq('id', commentId)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating comment:', error)
    throw error
  }

  return data as Comment
}
