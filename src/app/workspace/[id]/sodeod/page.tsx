'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SodeodCalendar from '@/components/SodeodCalendar'
import SodeodModal from '@/components/SodeodModal'
import RoutineManagementModal from '@/components/RoutineManagementModal'

interface Workspace {
  id: string
  user_id: string
  title: string
  created_at: string
}

export default function SodeodPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

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
  }, [userId, workspaceId])

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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
  }

  const handleRoutineModalOpen = () => {
    setIsRoutineModalOpen(true)
  }

  const handleRoutineModalClose = () => {
    setIsRoutineModalOpen(false)
  }

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year)
    setCurrentMonth(month)
  }

  const handleRoutineApplied = () => {
    // 루틴 적용/해제 시 페이지 새로고침하여 달력 업데이트
    window.location.reload()
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
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  SoD/EoD
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {workspace.title} - 시작/종료 일정 관리
                </p>
              </div>
              <Link
                href={`/workspace/${workspaceId}`}
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0"
              >
                <span>←</span>
                <span className="hidden sm:inline whitespace-nowrap">워크스페이스로</span>
              </Link>
            </div>
          </div>

          {/* 레이아웃: 모바일은 세로, 태블릿/데스크톱은 좌측 네비게이터 + 우측 컨텐츠 */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* 네비게이터 */}
            <aside className={`shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'md:w-64' : 'md:w-20'} lg:w-64`}>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 md:sticky md:top-10">
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
                    onClick={() => router.push(`/todo/${workspaceId}`)}
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
                    onClick={() => router.push(`/reminder/${workspaceId}`)}
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
                    onClick={() => router.push(`/workspace/${workspaceId}/sodeod`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 transition-all duration-200 group text-left"
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
            <div className="flex-1 min-w-0">
              {/* 달력 영역 */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            {userId && (
              <SodeodCalendar 
                onDateSelect={handleDateSelect} 
                workspaceId={workspaceId} 
                userId={userId}
                onMonthChange={handleMonthChange}
                onRoutineModalOpen={handleRoutineModalOpen}
              />
            )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SoD/EoD 모달 */}
      {isModalOpen && selectedDate && userId && (
        <SodeodModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          date={selectedDate}
          workspaceId={workspaceId}
          userId={userId}
        />
      )}

      {/* 루틴 관리 모달 */}
      {isRoutineModalOpen && userId && (
        <RoutineManagementModal
          isOpen={isRoutineModalOpen}
          onClose={handleRoutineModalClose}
          workspaceId={workspaceId}
          userId={userId}
          year={currentYear}
          month={currentMonth}
          onRoutineApplied={handleRoutineApplied}
        />
      )}
    </div>
  )
}

