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
        <div className="max-w-4xl mx-auto">
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

          {/* 워크스페이스 콘텐츠 영역 */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                기능 바로가기
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                워크스페이스의 주요 기능들에 빠르게 접근하세요.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* SoD/EoD 버튼 */}
              <button
                onClick={() => {
                  // 향후 SoD/EoD 페이지로 이동
                  console.log('SoD/EoD 기능으로 이동')
                }}
                className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                    <span className="text-xl">🌅</span>
                  </div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    SoD/EoD
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    시작/종료 일정 관리
                  </p>
                </div>
              </button>

              {/* 일정 리마인더 버튼 */}
              <button
                onClick={() => {
                  // 향후 일정 리마인더 페이지로 이동
                  console.log('일정 리마인더 기능으로 이동')
                }}
                className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                    <span className="text-xl">⏰</span>
                  </div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    일정 리마인더
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    알림 및 리마인더 설정
                  </p>
                </div>
              </button>

              {/* ToDo 버튼 */}
              <button
                onClick={() => {
                  // 향후 ToDo 페이지로 이동
                  console.log('ToDo 기능으로 이동')
                }}
                className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    <span className="text-xl">📝</span>
                  </div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    ToDo
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    할 일 목록 관리
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
