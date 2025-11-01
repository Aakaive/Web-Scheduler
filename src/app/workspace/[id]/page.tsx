'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Workspace {
  id: string
  user_id: string
  title: string
  created_at: string
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10">
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
        <main className="container mx-auto py-10">
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
      <main className="container mx-auto py-10">
        <div className="max-w-7xl mx-auto">
          {/* 워크스페이스 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {workspace.title}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  생성일: {new Date(workspace.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <Link
                href="/"
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                ← 워크스페이스 목록
              </Link>
            </div>
          </div>

          {/* 레이아웃: 좌측 네비게이터 + 우측 컨텐츠 */}
          <div className="flex gap-6">
            {/* 좌측 네비게이터 */}
            <aside className={`shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'w-64' : 'w-20'}`}>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 sticky top-10">
                {/* 토글 버튼 */}
                <div className="flex items-center justify-between mb-2">
                  {isSidebarExpanded && (
                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-2">
                      메뉴
                    </h2>
                  )}
                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors ${!isSidebarExpanded ? 'mx-auto' : 'ml-auto'}`}
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

                <nav className="space-y-1">
                  {/* SoD/EoD 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/workspace/${workspaceId}/sodeod`)
                    }}
                    className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group text-left"
                    title={!isSidebarExpanded ? 'SoD/EoD' : ''}
                  >
                    <div className={`flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                        <span className="text-lg">🌅</span>
                      </div>
                      {isSidebarExpanded && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                            SoD/EoD
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            시작/종료 일정 관리
                          </p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* 일정 리마인더 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/reminder/${workspaceId}`)
                    }}
                    className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group text-left"
                    title={!isSidebarExpanded ? '일정 리마인더' : ''}
                  >
                    <div className={`flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors shrink-0">
                        <span className="text-lg">⏰</span>
                      </div>
                      {isSidebarExpanded && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                            일정 리마인더
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            알림 및 리마인더 설정
                          </p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* ToDo 버튼 */}
                  <button
                    onClick={() => {
                      router.push(`/todo/${workspaceId}`)
                    }}
                    className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group text-left"
                    title={!isSidebarExpanded ? 'ToDo' : ''}
                  >
                    <div className={`flex items-center ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                        <span className="text-lg">📝</span>
                      </div>
                      {isSidebarExpanded && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                            ToDo
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            할 일 목록 관리
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                </nav>
              </div>
            </aside>

            {/* 우측 컨텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                    컨텐츠 영역
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    여기에 다른 컨텐츠를 배치할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
