'use client'

import { Todo } from '@/lib/supabase'
import { useState } from 'react'
import TodoToSodModal from './TodoToSodModal'

interface TodoListProps {
  todos: Todo[]
  loading: boolean
  userId: string
  workspaceId: string
  onDelete: (todoId: string) => void
  onToggle: (todoId: string, completed: boolean) => void
  onEdit: (todoId: string, summary: string, expression: string | null) => void
  onPin: (todoId: string, isPinned: boolean) => void
  onUp: (todoId: string) => void
  onRefresh: () => void
}

export default function TodoList({ todos, loading, userId, workspaceId, onDelete, onToggle, onEdit, onPin, onUp, onRefresh }: TodoListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSummary, setEditSummary] = useState('')
  const [editExpression, setEditExpression] = useState('')
  const [showInProgress, setShowInProgress] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [sodModalOpen, setSodModalOpen] = useState(false)
  const [selectedTodoForSod, setSelectedTodoForSod] = useState<Todo | null>(null)

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

  const handleOpenSodModal = (todo: Todo) => {
    setSelectedTodoForSod(todo)
    setSodModalOpen(true)
  }

  const handleCloseSodModal = () => {
    setSodModalOpen(false)
    setSelectedTodoForSod(null)
  }

  const handleSodSuccess = () => {
    onRefresh()
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => onToggle(todo.id, e.target.checked)}
              className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
            />
            <div className="flex gap-1 ml-auto">
            {!todo.completed && (
              <>
                {!todo.sod_id && (
                  <button
                    onClick={() => handleOpenSodModal(todo)}
                    className="p-2 text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                    aria-label="SOD 추가"
                    title="일정으로 추가"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onPin(todo.id, !todo.is_pinned)}
                  className={`p-2 transition-colors ${
                    todo.is_pinned
                      ? 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-500'
                      : 'text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400'
                  }`}
                  aria-label="고정"
                  title={todo.is_pinned ? '고정 해제' : '고정'}
                >
                  {todo.is_pinned ? (
                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v4.997a.31.31 0 0 1-.068.113c-.08.098-.213.207-.378.301-.947.543-1.713 1.54-2.191 2.488A6.237 6.237 0 0 0 4.82 14.4c-.1.48-.138 1.031.018 1.539C5.12 16.846 6.02 17 6.414 17H11v3a1 1 0 1 0 2 0v-3h4.586c.395 0 1.295-.154 1.575-1.061.156-.508.118-1.059.017-1.539a6.241 6.241 0 0 0-.541-1.5c-.479-.95-1.244-1.946-2.191-2.489a1.393 1.393 0 0 1-.378-.301.309.309 0 0 1-.068-.113V5h1a1 1 0 1 0 0-2H7a1 1 0 1 0 0 2h1Z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M12.0001 20v-4M7.00012 4h9.99998M9.00012 5v5c0 .5523-.46939 1.0045-.94861 1.279-1.43433.8217-2.60135 3.245-2.25635 4.3653.07806.2535.35396.3557.61917.3557H17.5859c.2652 0 .5411-.1022.6192-.3557.3449-1.1204-.8221-3.5436-2.2564-4.3653-.4792-.2745-.9486-.7267-.9486-1.279V5c0-.55228-.4477-1-1-1h-4c-.55226 0-.99998.44772-.99998 1Z"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onUp(todo.id)}
                  className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label="위로"
                  title="맨 앞으로 이동"
                >
                  <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m16 17-4-4-4 4m8-6-4-4-4 4"/>
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={() => handleStartEdit(todo)}
              className="p-2 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label="수정"
              title="수정"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.9-9.9a1 1 0 000-1.414l-3.536-3.536a1 1 0 00-1.414 0l-9.9 9.9A1 1 0 004 15.414V20z" />
              </svg>
            </button>
            <button
              onClick={() => handleDelete(todo.id, todo.summary)}
              className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="삭제"
              title="삭제"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              {todo.sod_id && (
                <span title="SOD와 동기화됨">
                  <svg 
                    className="w-6 h-6 text-gray-800 dark:text-white shrink-0 mt-0.5" 
                    aria-hidden="true" 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="24" 
                    height="24" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      stroke="currentColor" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M4 16h13M4 16l4-4m-4 4 4 4M20 8H7m13 0-4 4m4-4-4-4"
                    />
                  </svg>
                </span>
              )}
              <h3
                className={`text-base font-medium flex-1 ${
                  todo.completed
                    ? 'line-through text-zinc-500 dark:text-zinc-600'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {todo.summary}
              </h3>
              {todo.is_pinned && (
                <span className="text-purple-600 dark:text-purple-400 shrink-0" title="고정됨">
                  <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v4.997a.31.31 0 0 1-.068.113c-.08.098-.213.207-.378.301-.947.543-1.713 1.54-2.191 2.488A6.237 6.237 0 0 0 4.82 14.4c-.1.48-.138 1.031.018 1.539C5.12 16.846 6.02 17 6.414 17H11v3a1 1 0 1 0 2 0v-3h4.586c.395 0 1.295-.154 1.575-1.061.156-.508.118-1.059.017-1.539a6.241 6.241 0 0 0-.541-1.5c-.479-.95-1.244-1.946-2.191-2.489a1.393 1.393 0 0 1-.378-.301.309.309 0 0 1-.068-.113V5h1a1 1 0 1 0 0-2H7a1 1 0 1 0 0 2h1Z"/>
                  </svg>
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
            <div className="text-xs text-zinc-400 dark:text-zinc-600">
              생성: {new Date(todo.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
            </div>
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

      <TodoToSodModal
        isOpen={sodModalOpen}
        onClose={handleCloseSodModal}
        todoId={selectedTodoForSod?.id || ''}
        todoSummary={selectedTodoForSod?.summary || ''}
        workspaceId={workspaceId}
        userId={userId}
        onSuccess={handleSodSuccess}
      />
    </div>
  )
}

