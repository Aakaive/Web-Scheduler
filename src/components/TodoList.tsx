'use client'

import { Todo } from '@/lib/supabase'
import { useState } from 'react'

interface TodoListProps {
  todos: Todo[]
  loading: boolean
  userId: string
  onDelete: (todoId: string) => void
  onToggle: (todoId: string, completed: boolean) => void
  onEdit: (todoId: string, title: string, content: string | null) => void
}

export default function TodoList({ todos, loading, userId, onDelete, onToggle, onEdit }: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const handleDelete = async (todoId: string, title: string) => {
    const confirmed = window.confirm(`할 일 "${title}"을(를) 삭제하시겠습니까?`)
    if (confirmed) {
      onDelete(todoId)
    }
  }

  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditContent(todo.content || '')
  }

  const handleSaveEdit = (todoId: string) => {
    if (!editTitle.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    onEdit(todoId, editTitle, editContent)
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

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
    <div className="space-y-3">
      {todos.map((todo) => (
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                placeholder="제목"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 min-h-[80px]"
                placeholder="내용 (선택사항)"
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
                className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-base font-medium mb-1 ${
                    todo.completed
                      ? 'line-through text-zinc-500 dark:text-zinc-600'
                      : 'text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {todo.title}
                </h3>
                {todo.content && (
                  <p
                    className={`text-sm whitespace-pre-wrap ${
                      todo.completed
                        ? 'text-zinc-400 dark:text-zinc-600'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {todo.content}
                  </p>
                )}
                <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                  생성: {new Date(todo.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleStartEdit(todo)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="할 일 수정"
                  title="할 일 수정"
                >
                  <span className="text-sm">✏️</span>
                </button>
                <button
                  onClick={() => handleDelete(todo.id, todo.title)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="할 일 삭제"
                  title="할 일 삭제"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

