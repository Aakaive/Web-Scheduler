'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getTodosByWorkspace, Todo, getRemindersByWorkspace, Reminder, getSodsByDate, Sod, updateSod, updateTodo } from '@/lib/supabase'
import Link from 'next/link'

interface Workspace {
  id: string
  user_id: string
  title: string
  created_at: string
}

// 서울 시간 기준 오늘 날짜를 YYYY-MM-DD 문자열로 반환하는 헬퍼 함수
const getSeoulTodayString = () => {
  const now = new Date()
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [inProgressTodos, setInProgressTodos] = useState<Todo[]>([])
  const [loadingTodos, setLoadingTodos] = useState(true)
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([])
  const [loadingReminders, setLoadingReminders] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(getSeoulTodayString())
  const [sods, setSods] = useState<Sod[]>([])
  const [loadingSods, setLoadingSods] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId || !workspaceId) return
    fetchWorkspace()
    fetchInProgressTodos()
    fetchTodayReminders()
  }, [userId, workspaceId])

  useEffect(() => {
    if (!userId || !workspaceId) return
    fetchSods()
  }, [userId, workspaceId, selectedDate])

  const fetchWorkspace = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('user_id', userId)
        .single()

      if (err) {
        if (err.code === 'PGRST116') {
          setError('워크스페이스를 찾을 수 없습니다.')
        } else {
          throw err
        }
        return
      }

      setWorkspace(data as Workspace)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '워크스페이스를 불러오지 못했어요')
    } finally {
      setLoading(false)
    }
  }

  const fetchInProgressTodos = async () => {
    try {
      setLoadingTodos(true)
      const data = await getTodosByWorkspace(workspaceId)
      // 진행중인 항목만 필터링하고 최대 5개까지만 가져오기
      const inProgress = data.filter(todo => !todo.completed).slice(0, 5)
      setInProgressTodos(inProgress)
    } catch (e) {
      console.error('Failed to fetch todos:', e)
    } finally {
      setLoadingTodos(false)
    }
  }

  const fetchTodayReminders = async () => {
    try {
      setLoadingReminders(true)
      const data = await getRemindersByWorkspace(workspaceId)
      
      // 서울 시간 기준 현재 날짜와 시간
      const now = new Date()
      const seoulNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const todayStart = new Date(seoulNow)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(seoulNow)
      todayEnd.setHours(23, 59, 59, 999)
      
      // 오늘 시작하고 아직 종료되지 않은 일정만 필터링
      const today = data.filter(reminder => {
        const startDate = new Date(reminder.start)
        const endDate = new Date(reminder.end)
        
        // 시작 시간이 오늘인지 확인
        const isStartToday = startDate >= todayStart && startDate <= todayEnd
        
        // 종료 시간이 아직 지나지 않았는지 확인
        const isNotEnded = endDate > seoulNow
        
        return isStartToday && isNotEnded
      })
      
      // 시작 시간 순으로 정렬하고 최대 5개
      const sorted = today.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      ).slice(0, 5)
      
      setTodayReminders(sorted)
    } catch (e) {
      console.error('Failed to fetch reminders:', e)
    } finally {
      setLoadingReminders(false)
    }
  }

  const fetchSods = async () => {
    if (!userId) return
    
    try {
      setLoadingSods(true)
      const data = await getSodsByDate(workspaceId, userId, selectedDate)
      setSods(data)
    } catch (e) {
      console.error('Failed to fetch SODs:', e)
    } finally {
      setLoadingSods(false)
    }
  }

  const goToPreviousDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() - 1)
    const newDateStr = date.toLocaleDateString('en-CA')
    setSelectedDate(newDateStr)
  }

  const goToNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    date.setDate(date.getDate() + 1)
    const newDateStr = date.toLocaleDateString('en-CA')
    setSelectedDate(newDateStr)
  }

  const goToToday = () => {
    setSelectedDate(getSeoulTodayString())
  }

  const isToday = () => {
    return selectedDate === getSeoulTodayString()
  }

  const handleSodCheckToggle = async (sodId: string, currentCheck: boolean) => {
    if (!userId) return
    
    try {
      await updateSod(sodId, userId, { check: !currentCheck })
      // SoD 목록 새로고침
      fetchSods()
    } catch (e) {
      console.error('Failed to toggle SOD check:', e)
    }
  }

  const handleTodoToggle = async (todoId: string, currentCompleted: boolean) => {
    if (!userId) return
    
    try {
      await updateTodo(todoId, userId, { completed: !currentCompleted })
      // ToDo 목록 새로고침
      fetchInProgressTodos()
    } catch (e) {
      console.error('Failed to toggle todo:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="flex items-center justify-center">
            <div className="text-lg text-zinc-600 dark:text-zinc-400">
              워크스페이스를 불러오는 중...
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="flex flex-col items-center justify-center">
            <div className="text-lg text-red-600 dark:text-red-400 mb-4">
              {error || '워크스페이스를 찾을 수 없습니다.'}
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 워크스페이스 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {workspace.title}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  생성일: {new Date(workspace.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <Link
                href="/"
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0"
              >
                <span>←</span>
                <span className="hidden sm:inline whitespace-nowrap">워크스페이스 목록</span>
              </Link>
            </div>
          </div>

          {/* 레이아웃: 모바일은 세로, 태블릿/데스크톱은 좌측 네비게이터 + 우측 컨텐츠 */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* 네비게이터 (모바일: 상단 가로, 태블릿: 좌측 아이콘만, 데스크톱: 좌측 전체) */}
            <aside className={`shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'md:w-64' : 'md:w-20'} lg:w-64`}>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 md:sticky md:top-10">
                {/* 태블릿/데스크톱: 메뉴 제목 + 토글 버튼 */}
                <div className="hidden md:flex items-center justify-between mb-2">
                  <h2 className={`text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-2 whitespace-nowrap ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                    메뉴
                  </h2>
                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`lg:hidden p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors ${!isSidebarExpanded ? 'mx-auto' : 'ml-auto'}`}
                    title={isSidebarExpanded ? '메뉴 접기' : '메뉴 펼치기'}
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ${isSidebarExpanded ? 'rotate-0' : 'rotate-180'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <nav className="flex md:flex-col gap-2 md:gap-1">
                  {/* ToDo 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/todo/${workspaceId}`)
                    }}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group text-left"
                    title="ToDo"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          ToDo
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          할 일 목록 관리
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* 일정 리마인더 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/reminder/${workspaceId}`)
                    }}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group text-left"
                    title="일정 리마인더"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5.464V3.099m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175C19 17.4 19 18 18.462 18H5.538C5 18 5 17.4 5 16.807c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.464ZM6 5 5 4M4 9H3m15-4 1-1m1 5h1M8.54 18a3.48 3.48 0 0 0 6.92 0H8.54Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          리마인더
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          알림 및 리마인더 설정
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* SoD/EoD 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/workspace/${workspaceId}/sodeod`)
                    }}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group text-left"
                    title="SoD/EoD"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m11.5 11.5 2.071 1.994M4 10h5m11 0h-1.5M12 7V4M7 7V4m10 3V4m-7 13H8v-2l5.227-5.292a1.46 1.46 0 0 1 2.065 2.065L10 17Zm-5 3h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          SoD/EoD
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          시작/종료 일정 관리
                        </p>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </aside>

            {/* 우측 컨텐츠 영역 */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* 진행중인 ToDo 섹션 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 py-3 px-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"/>
                    </svg>
                    <span>ToDo</span>
                  </h2>
                  <Link
                    href={`/todo/${workspaceId}`}
                    className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  >
                    전체보기 →
                  </Link>
                </div>

                {loadingTodos ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                    할 일을 불러오는 중...
                  </div>
                ) : inProgressTodos.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      진행중인 할 일이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6 scroll-on-hover">
                    <div className="flex gap-4 min-w-min pb-2">
                      {inProgressTodos.map(todo => (
                        <div
                          key={todo.id}
                          className="shrink-0 w-64 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer"
                          onClick={() => router.push(`/todo/${workspaceId}`)}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                                todo.completed
                                  ? 'border-purple-500 bg-purple-500'
                                  : 'border-zinc-300 dark:border-zinc-700 hover:border-purple-400 dark:hover:border-purple-500'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTodoToggle(todo.id, todo.completed)
                              }}
                            >
                              {todo.completed && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 flex-1 line-clamp-2">
                                  {todo.summary}
                                </h3>
                                {todo.is_pinned && (
                                  <span className="text-purple-600 dark:text-purple-400 shrink-0" title="고정됨">
                                    <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v4.997a.31.31 0 0 1-.068.113c-.08.098-.213.207-.378.301-.947.543-1.713 1.54-2.191 2.488A6.237 6.237 0 0 0 4.82 14.4c-.1.48-.138 1.031.018 1.539C5.12 16.846 6.02 17 6.414 17H11v3a1 1 0 1 0 2 0v-3h4.586c.395 0 1.295-.154 1.575-1.061.156-.508.118-1.059.017-1.539a6.241 6.241 0 0 0-.541-1.5c-.479-.95-1.244-1.946-2.191-2.489a1.393 1.393 0 0 1-.378-.301.309.309 0 0 1-.068-.113V5h1a1 1 0 1 0 0-2H7a1 1 0 1 0 0 2h1Z"/>
                                    </svg>
                                  </span>
                                )}
                              </div>
                              {todo.expression && (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3">
                                  {todo.expression}
                                </p>
                              )}
                              <div className="text-xs text-zinc-400 dark:text-zinc-600">
                                {new Date(todo.created_at).toLocaleDateString('ko-KR', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 오늘의 일정 섹션 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 py-3 px-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5.464V3.099m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175C19 17.4 19 18 18.462 18H5.538C5 18 5 17.4 5 16.807c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.464ZM6 5 5 4M4 9H3m15-4 1-1m1 5h1M8.54 18a3.48 3.48 0 0 0 6.92 0H8.54Z"/>
                    </svg>
                    <span>오늘의 일정</span>
                  </h2>
                  <Link
                    href={`/reminder/${workspaceId}`}
                    className="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                  >
                    전체보기 →
                  </Link>
                </div>

                {loadingReminders ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                    일정을 불러오는 중...
                  </div>
                ) : todayReminders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      오늘 예정된 일정이 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6 scroll-on-hover">
                    <div className="flex gap-4 min-w-min pb-2">
                      {todayReminders.map(reminder => {
                        const startDate = new Date(reminder.start)
                        const endDate = new Date(reminder.end)
                        const startTime = startDate.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Seoul'
                        })
                        const endTime = endDate.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Seoul'
                        })
                        
                        return (
                          <div
                            key={reminder.id}
                            className="shrink-0 w-64 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all cursor-pointer"
                            onClick={() => router.push(`/reminder/${workspaceId}`)}
                          >
                            <div className="mb-2">
                              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-1">
                                {reminder.summary}
                              </h3>
                              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {startTime} - {endTime}
                              </div>
                            </div>
                            {reminder.expression && (
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3">
                                {reminder.expression}
                              </p>
                            )}
                            <div className="text-xs text-zinc-400 dark:text-zinc-600">
                              생성: {new Date(reminder.created_at).toLocaleDateString('ko-KR', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Seoul'
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SoD 섹션 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 py-3 px-6">
                <div className="space-y-3 mb-4">
                  {/* 첫 번째 줄: SoD 제목 + 전체보기 */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m11.5 11.5 2.071 1.994M4 10h5m11 0h-1.5M12 7V4M7 7V4m10 3V4m-7 13H8v-2l5.227-5.292a1.46 1.46 0 0 1 2.065 2.065L10 17Zm-5 3h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                      </svg>
                      <span>SoD</span>
                    </h2>
                    <Link
                      href={`/workspace/${workspaceId}/sodeod`}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      전체보기 →
                    </Link>
                  </div>
                  
                  {/* 두 번째 줄: 날짜 네비게이터 (중앙 정렬) */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={goToPreviousDay}
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                      title="이전 날짜"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-md min-w-[140px] justify-center">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {(() => {
                          const [year, month, day] = selectedDate.split('-').map(Number)
                          const date = new Date(year, month - 1, day)
                          return date.toLocaleDateString('ko-KR', { 
                            month: 'long', 
                            day: 'numeric'
                          })
                        })()}
                      </span>
                      {!isToday() && (
                        <button
                          onClick={goToToday}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          오늘
                        </button>
                      )}
                    </div>
                    <button
                      onClick={goToNextDay}
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                      title="다음 날짜"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {loadingSods ? (
                  <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                    SoD를 불러오는 중...
                  </div>
                ) : sods.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      이 날짜에 등록된 SoD가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sods.map(sod => {
                      const startTime = sod.start_at 
                        ? sod.start_at.substring(0, 5) // HH:MM만 추출
                        : '시간 미정'
                      const endTime = sod.end_at 
                        ? sod.end_at.substring(0, 5) // HH:MM만 추출
                        : '시간 미정'
                      
                      return (
                        <div
                          key={sod.id}
                          className={`p-4 border rounded-lg transition-all cursor-pointer ${
                            sod.check
                              ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50'
                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                          }`}
                          onClick={() => router.push(`/workspace/${workspaceId}/sodeod`)}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer ${
                                sod.check
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSodCheckToggle(sod.id, sod.check)
                              }}
                            >
                              {sod.check && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1">
                                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium shrink-0">
                                  {startTime} - {endTime}
                                </div>
                                {sod.summary && (
                                  <h3 className={`text-base font-medium flex-1 ${
                                    sod.check
                                      ? 'line-through text-zinc-500 dark:text-zinc-600'
                                      : 'text-zinc-900 dark:text-zinc-100'
                                  }`}>
                                    {sod.summary.startsWith('(루틴)') ? (
                                      <>
                                        <span className="text-purple-600 dark:text-purple-400">(루틴)</span>
                                        {sod.summary.substring(4)}
                                      </>
                                    ) : (
                                      sod.summary
                                    )}
                                  </h3>
                                )}
                              </div>
                              {sod.expression && (
                                <p className={`text-sm whitespace-pre-wrap ${
                                  sod.check
                                    ? 'text-zinc-400 dark:text-zinc-600'
                                    : 'text-zinc-600 dark:text-zinc-400'
                                }`}>
                                  {sod.expression}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
