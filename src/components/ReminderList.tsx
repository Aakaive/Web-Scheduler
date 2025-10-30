'use client'

import { Reminder } from '@/lib/supabase'

interface ReminderListProps {
  reminders: Reminder[]
  loading: boolean
  userId: string
  onDelete: (reminderId: string) => void
}

export default function ReminderList({ reminders, loading, userId, onDelete }: ReminderListProps) {
  const handleDelete = async (reminderId: string, summary: string, googleEventId: string | null) => {
    const confirmed = window.confirm(`일정 "${summary}"을(를) 삭제하시겠습니까?`)
    if (confirmed) {
      // Google Calendar에서 삭제 (event ID가 있는 경우)
      if (googleEventId) {
        try {
          const googleToken = typeof window !== 'undefined' ? localStorage.getItem('google_provider_token') : null
          if (googleToken) {
            const response = await fetch('/api/calendar', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                eventId: googleEventId,
                googleToken,
              }),
            })
            
            if (!response.ok) {
              console.error('Failed to delete from Google Calendar')
              // Supabase에서는 삭제하지만 경고 표시
              alert('일정은 삭제되었지만 구글 캘린더에서 삭제하지 못했습니다.')
            } else {
              console.log('Successfully deleted from Google Calendar')
            }
          }
        } catch (error) {
          console.error('Error deleting from Google Calendar:', error)
          alert('일정은 삭제되었지만 구글 캘린더 API 호출 중 오류가 발생했습니다.')
        }
      }
      
      onDelete(reminderId)
    }
  }
  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        일정을 불러오는 중...
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        등록된 일정이 없습니다. 일정 추가 버튼을 눌러 일정을 만들어 보세요.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {reminder.summary}
                </h3>
                <button
                  onClick={() => handleDelete(reminder.id, reminder.summary, reminder.google_event_id)}
                  className="ml-3 inline-flex items-center justify-center w-7 h-7 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="일정 삭제"
                  title="일정 삭제"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              
              <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 dark:text-zinc-600">시작:</span>
                  <span>{new Date(reminder.start).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 dark:text-zinc-600">종료:</span>
                  <span>{new Date(reminder.end).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                </div>
                {reminder.expression && (
                  <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-500 dark:text-zinc-500">
                      {reminder.expression}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
            생성: {new Date(reminder.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
        </div>
      ))}
    </div>
  )
}

