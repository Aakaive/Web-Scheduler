'use client'

import { Todo } from '@/lib/supabase'
import { useState } from 'react'

interface TodoListProps {
  todos: Todo[]
  loading: boolean
  userId: string
  onDelete: (todoId: string) => void
  onToggle: (todoId: string, completed: boolean) => void
  onEdit: (todoId: string, summary: string, expression: string | null) => void
  onPin: (todoId: string, isPinned: boolean) => void
  onUp: (todoId: string) => void
}

export default function TodoList({ todos, loading, userId, onDelete, onToggle, onEdit, onPin, onUp }: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSummary, setEditSummary] = useState('')
  const [editExpression, setEditExpression] = useState('')
  const [showInProgress, setShowInProgress] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)

  const inProgressTodos = todos.filter(todo => !todo.completed)
  const completedTodos = todos.filter(todo => todo.completed)

  const handleDelete = async (todoId: string, summary: string) => {
    const confirmed = window.confirm(`할 일 "${summary}"을(를) 삭제하시겠습니까?`)
    if (confirmed) {
      onDelete(todoId)
    }
  }

  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditSummary(todo.summary)
    setEditExpression(todo.expression || '')
  }

  const handleSaveEdit = (todoId: string) => {
    if (!editSummary.trim()) {
      alert('요약을 입력해주세요.')
      return
    }
    onEdit(todoId, editSummary, editExpression)
    setEditingId(null)
    setEditSummary('')
    setEditExpression('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditSummary('')
    setEditExpression('')
  }

  const renderTodoItem = (todo: Todo) => (
    <div
      key={todo.id}
      className={`p-4 border rounded-lg transition-colors ${
        todo.completed
          ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/50'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {editingId === todo.id ? (
        // 편집 모드
        <div className="space-y-3">
          <input
            type="text"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            placeholder="요약"
          />
          <textarea
            value={editExpression}
            onChange={(e) => setEditExpression(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-h-[80px]"
            placeholder="상세 내용 (선택사항)"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveEdit(todo.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              저장
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors text-sm"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        // 일반 보기 모드
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => onToggle(todo.id, e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3
                className={`text-base font-medium ${
                  todo.completed
                    ? 'line-through text-zinc-500 dark:text-zinc-600'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {todo.summary}
              </h3>
              {todo.is_pinned && (
                <span className="text-yellow-500" title="고정됨">
                  📌
                </span>
              )}
            </div>
            {todo.expression && (
              <p
                className={`text-sm whitespace-pre-wrap ${
                  todo.completed
                    ? 'text-zinc-400 dark:text-zinc-600'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {todo.expression}
              </p>
            )}
            <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
              생성: {new Date(todo.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
            </div>
          </div>
          <div className="flex gap-1">
            {!todo.completed && (
              <>
                <button
                  onClick={() => onPin(todo.id, !todo.is_pinned)}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
                    todo.is_pinned
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-900/30'
                  }`}
                  aria-label="고정"
                  title={todo.is_pinned ? '고정 해제' : '고정'}
                >
                  <span className="text-sm">📌</span>
                </button>
                <button
                  onClick={() => onUp(todo.id)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/30 transition-colors"
                  aria-label="위로"
                  title="맨 앞으로 이동"
                >
                  <span className="text-sm">⬆️</span>
                </button>
              </>
            )}
            <button
              onClick={() => handleStartEdit(todo)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="수정"
              title="수정"
            >
              <span className="text-sm">✏️</span>
            </button>
            <button
              onClick={() => handleDelete(todo.id, todo.summary)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="삭제"
              title="삭제"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        할 일을 불러오는 중...
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        등록된 할 일이 없습니다. 할 일 추가 버튼을 눌러 새로운 할 일을 만들어 보세요.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 진행중 섹션 */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowInProgress(!showInProgress)}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              진행중
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({inProgressTodos.length})
            </span>
          </div>
          <span className="text-zinc-600 dark:text-zinc-400">
            {showInProgress ? '▼' : '▶'}
          </span>
        </button>
        {showInProgress && (
          <div className="p-4 space-y-3">
            {inProgressTodos.length === 0 ? (
              <div className="text-center py-4 text-zinc-500 dark:text-zinc-500 text-sm">
                진행중인 할 일이 없습니다.
              </div>
            ) : (
              inProgressTodos.map(renderTodoItem)
            )}
          </div>
        )}
      </div>

      {/* 달성 섹션 */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              달성
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({completedTodos.length})
            </span>
          </div>
          <span className="text-zinc-600 dark:text-zinc-400">
            {showCompleted ? '▼' : '▶'}
          </span>
        </button>
        {showCompleted && (
          <div className="p-4 space-y-3">
            {completedTodos.length === 0 ? (
              <div className="text-center py-4 text-zinc-500 dark:text-zinc-500 text-sm">
                달성한 할 일이 없습니다.
              </div>
            ) : (
              completedTodos.map(renderTodoItem)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

