"use client";

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getRemindersByWorkspace, Reminder, deleteReminder } from '@/lib/supabase'
import Link from 'next/link'
import ReminderList from '@/components/ReminderList'
import ReminderModal from '@/components/ReminderModal'

export default function ReminderPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params?.workspaceId as string

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
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
    if (!workspaceId || !userId) return
    fetchReminders()
  }, [workspaceId, userId])

  const fetchReminders = async () => {
    try {
      setLoading(true)
      const data = await getRemindersByWorkspace(workspaceId)
      setReminders(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '일정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleReminderAdded = () => {
    fetchReminders()
  }

  const handleReminderDeleted = async (reminderId: string) => {
    if (!userId) return
    
    try {
      await deleteReminder(reminderId, userId)
      fetchReminders() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '일정 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  일정 리마인더
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  워크스페이스 ID: {workspaceId}
                </p>
              </div>
              <Link
                href="/"
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                ← 홈으로
              </Link>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                일정 목록
              </h2>
              {userId && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  + 일정 추가
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {userId && (
              <ReminderList 
                reminders={reminders} 
                loading={loading}
                userId={userId}
                onDelete={handleReminderDeleted}
              />
            )}
          </div>
        </div>
      </main>

      {/* 리마인더 추가 모달 */}
      {userId && (
        <ReminderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          userId={userId}
          onReminderAdded={handleReminderAdded}
        />
      )}
    </div>
  )
}
