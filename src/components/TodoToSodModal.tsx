'use client'

import { useEffect, useState } from 'react'
import { createSodFromTodo } from '@/lib/supabase'
import { useWorkspaceCategories } from '@/hooks/useWorkspaceCategories'

interface TodoToSodModalProps {
  isOpen: boolean
  onClose: () => void
  todoId: string
  todoSummary: string
  workspaceId: string
  userId: string
  onSuccess: () => void
}

export default function TodoToSodModal({
  isOpen,
  onClose,
  todoId,
  todoSummary,
  workspaceId,
  userId,
  onSuccess,
}: TodoToSodModalProps) {
  const [date, setDate] = useState(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  
  const [startHour, setStartHour] = useState<number>(9)
  const [startMinute, setStartMinute] = useState<number>(0)
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM')
  const [endHour, setEndHour] = useState<number>(10)
  const [endMinute, setEndMinute] = useState<number>(0)
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('AM')
  const [includeEndTime, setIncludeEndTime] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { categories, loading: categoriesLoading } = useWorkspaceCategories(workspaceId, {
    enabled: isOpen,
  })
  const [categoryId, setCategoryId] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (categories.length > 0) {
      setCategoryId((prev) => prev ?? categories[0].id)
    } else {
      setCategoryId(null)
    }
  }, [categories, isOpen])

  const to24Hour = (hour: number, minute: number, ampm: 'AM' | 'PM'): string => {
    let h24 = hour
    if (ampm === 'PM' && hour !== 12) h24 = hour + 12
    if (ampm === 'AM' && hour === 12) h24 = 0
    const hh = String(h24).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    return `${hh}:${mm}:00`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!categoryId) {
      setError('활동 태그를 선택해주세요.')
      setIsSubmitting(false)
      return
    }

    try {
      const startAt = to24Hour(startHour, startMinute, startAmPm)
      const endAt = includeEndTime ? to24Hour(endHour, endMinute, endAmPm) : null

      await createSodFromTodo(
        todoId,
        userId,
        workspaceId,
        date,
        startAt,
        endAt,
        categoryId
      )

      setCategoryId(categories[0]?.id ?? null)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SOD 추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      setCategoryId(categories[0]?.id ?? null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full mx-4 border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            SOD에 추가
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            &quot;{todoSummary}&quot;를 일정으로 추가합니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!categoriesLoading && categories.length === 0 && (
              <div className="text-sm text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                태그가 비어있습니다. 태그 관리에서 태그를 추가한 뒤 다시 시도해주세요.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                날짜 *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                시작 시간 *
              </label>
              <div className="flex gap-2">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  required
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{h}시</option>
                  ))}
                </select>
                <select
                  value={startMinute}
                  onChange={(e) => setStartMinute(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
                  ))}
                </select>
                <select
                  value={startAmPm}
                  onChange={(e) => setStartAmPm(e.target.value as 'AM' | 'PM')}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="AM">오전</option>
                  <option value="PM">오후</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="includeEndTime"
                  checked={includeEndTime}
                  onChange={(e) => setIncludeEndTime(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeEndTime" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  종료 시간 설정
                </label>
              </div>
              {includeEndTime && (
                <div className="flex gap-2">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
                    ))}
                  </select>
                  <select
                    value={endAmPm}
                    onChange={(e) => setEndAmPm(e.target.value as 'AM' | 'PM')}
                    disabled={isSubmitting}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="AM">오전</option>
                    <option value="PM">오후</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                활동 태그 *
              </label>
              <select
                value={categoryId ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setCategoryId(value ? Number(value) : null)
                }}
                disabled={isSubmitting || categories.length === 0}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-zinc-50 dark:disabled:bg-zinc-900/50"
              >
                {categories.length === 0 ? (
                  <option value="">등록된 태그가 없습니다</option>
                ) : (
                  categories.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.summary}
                    </option>
                  ))
                )}
              </select>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || categories.length === 0}
              >
                {isSubmitting ? '추가 중...' : 'SOD에 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

