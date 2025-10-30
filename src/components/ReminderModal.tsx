'use client'

import { useState, FormEvent } from 'react'
import { createReminder, Reminder, supabase } from '@/lib/supabase'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  userId: string
  onReminderAdded: () => void
}

export default function ReminderModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  onReminderAdded,
}: ReminderModalProps) {
  const [summary, setSummary] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [expression, setExpression] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!summary.trim() || !start || !end) {
      setError('제목, 시작 시간, 종료 시간은 필수 항목입니다.')
      return
    }

    if (new Date(start) >= new Date(end)) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // datetime-local 값을 서울 시간대로 변환
      // datetime-local은 "YYYY-MM-DDTHH:MM" 형식이며, 브라우저가 로컬 시간으로 해석
      // 한국에서는 이미 KST(UTC+9)로 해석되므로, 이를 UTC로 변환해 저장
      // 예: "2024-01-15T14:30" (KST 14:30) -> "2024-01-15T05:30:00.000Z" (UTC 05:30)
      const startISO = start ? new Date(start).toISOString() : start
      const endISO = end ? new Date(end).toISOString() : end

      // Supabase에 리마인더 추가
      const reminder: Omit<Reminder, 'id' | 'created_at'> = {
        summary,
        start: startISO,
        end: endISO,
        expression: expression || null,
        user_id: userId,
        workspace_id: workspaceId,
        google_event_id: null,
      }

      const createdReminder = await createReminder(reminder)

      // localStorage에서 Google 토큰 가져오기
      const googleToken = typeof window !== 'undefined' ? localStorage.getItem('google_provider_token') : null
      
      console.log('Google token available:', !!googleToken)
      console.log('localStorage items:', typeof window !== 'undefined' ? Object.keys(localStorage) : 'N/A')
      
      let googleEventId = null
      
      // 구글 캘린더에 일정 추가 (토큰이 있는 경우에만)
      if (googleToken) {
        try {
          const calendarResponse = await fetch('/api/calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary,
              start: startISO,
              end: endISO,
              workspaceId,
              googleToken,
            }),
          })

          if (!calendarResponse.ok) {
            const errorData = await calendarResponse.json()
            console.error('Failed to add to Google Calendar:', errorData)
            // Supabase는 성공했지만 캘린더 추가가 실패한 경우 경고만 표시
            alert(`일정은 저장되었지만 구글 캘린더에 추가하지 못했습니다: ${errorData.error}`)
          } else {
            const result = await calendarResponse.json()
            console.log('Successfully added to Google Calendar:', result)
            googleEventId = result.event?.id
          }
        } catch (calendarError) {
          console.error('Error calling calendar API:', calendarError)
          alert('일정은 저장되었지만 구글 캘린더 API 호출 중 오류가 발생했습니다.')
        }
      } else {
        console.warn('Google token not available, skipping calendar sync')
      }
      
      // Google event ID를 Supabase에 업데이트
      if (googleEventId && createdReminder.id) {
        try {
          await supabase
            .from('reminders')
            .update({ google_event_id: googleEventId })
            .eq('id', createdReminder.id)
          console.log('Google event ID saved to database')
        } catch (updateError) {
          console.error('Failed to save Google event ID:', updateError)
        }
      }

      // 폼 초기화
      setSummary('')
      setStart('')
      setEnd('')
      setExpression('')
      
      onReminderAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            일정 추가
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="일정 제목을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              시작 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              종료 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              메모
            </label>
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="일정에 대한 메모를 입력하세요"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

