'use client'

import { useState } from 'react'
import { createTodo } from '@/lib/supabase'

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  userId: string
  onTodoAdded: () => void
}

export default function TodoModal({ isOpen, onClose, workspaceId, userId, onTodoAdded }: TodoModalProps) {
  const [summary, setSummary] = useState('')
  const [expression, setExpression] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!summary.trim()) {
      setError('요약을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createTodo({
        workspace_id: workspaceId,
        user_id: userId,
        summary: summary.trim(),
        expression: expression.trim() || null,
      })

      setSummary('')
      setExpression('')
      onTodoAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '할 일 추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSummary('')
      setExpression('')
      setError(null)
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
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            할 일 추가
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                요약 *
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="해야할 일을 간단히 입력하세요"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                상세 (선택사항)
              </label>
              <textarea
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[120px]"
                placeholder="할 일에 대한 상세 내용을 입력하세요"
                disabled={isSubmitting}
              />
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
                className="px-4 py-2 text-sm font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? '추가 중...' : '추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

