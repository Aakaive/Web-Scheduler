'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SodeodCalendar from '@/components/SodeodCalendar'
import SodeodModal from '@/components/SodeodModal'

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
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  SoD/EoD
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {workspace.title} - 시작/종료 일정 관리
                </p>
              </div>
              <Link
                href={`/workspace/${workspaceId}`}
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                ← 워크스페이스로
              </Link>
            </div>
          </div>

          {/* 달력 영역 */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            {userId && (
              <SodeodCalendar onDateSelect={handleDateSelect} workspaceId={workspaceId} userId={userId} />
            )}
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
    </div>
  )
}

