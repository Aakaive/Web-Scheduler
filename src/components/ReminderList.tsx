'use client'

import { Reminder, getRefreshedGoogleToken, supabase } from '@/lib/supabase'

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
      if (googleEventId) {
        try {
          const googleToken = await getRefreshedGoogleToken()
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
              const errorData = await response.json()
              console.error('Failed to delete from Google Calendar:', errorData)
              
              if (errorData.needsReauth) {
                alert('구글 로그인이 만료되었습니다. 다시 로그인해주세요.')
                await supabase.auth.signOut()
                window.location.reload()
                return
              }
              
              alert('일정은 삭제되었지만 구글 캘린더에서 삭제하지 못했습니다.')
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
                  className="ml-3 p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  aria-label="일정 삭제"
                  title="일정 삭제"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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

