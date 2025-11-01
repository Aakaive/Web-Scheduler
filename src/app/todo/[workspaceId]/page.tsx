'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, getTodosByWorkspace, Todo, deleteTodo, updateTodo, toggleTodoPin, upTodo } from '@/lib/supabase'
import Link from 'next/link'
import TodoList from '@/components/TodoList'
import TodoModal from '@/components/TodoModal'

export default function TodoPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params?.workspaceId as string

  const [todos, setTodos] = useState<Todo[]>([])
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
    fetchTodos()
  }, [workspaceId, userId])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const data = await getTodosByWorkspace(workspaceId)
      setTodos(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTodoAdded = () => {
    fetchTodos()
  }

  const handleTodoDeleted = async (todoId: string) => {
    if (!userId) return
    
    try {
      await deleteTodo(todoId, userId)
      fetchTodos() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일 삭제에 실패했습니다.')
    }
  }

  const handleTodoToggle = async (todoId: string, completed: boolean) => {
    if (!userId) return
    
    try {
      await updateTodo(todoId, userId, { completed })
      fetchTodos() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일 상태 변경에 실패했습니다.')
    }
  }

  const handleTodoEdit = async (todoId: string, summary: string, expression: string | null) => {
    if (!userId) return
    
    try {
      await updateTodo(todoId, userId, { summary, expression })
      fetchTodos() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일 수정에 실패했습니다.')
    }
  }

  const handleTodoPin = async (todoId: string, isPinned: boolean) => {
    if (!userId) return
    
    try {
      await toggleTodoPin(todoId, userId, isPinned)
      fetchTodos() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일 고정에 실패했습니다.')
    }
  }

  const handleTodoUp = async (todoId: string) => {
    if (!userId) return
    
    try {
      await upTodo(todoId, userId)
      fetchTodos() // 목록 새로고침
    } catch (e) {
      setError(e instanceof Error ? e.message : '할 일 이동에 실패했습니다.')
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
                  ToDo
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  워크스페이스 ID: {workspaceId}
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

          {/* 콘텐츠 영역 */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                할 일 목록
              </h2>
              {userId && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  + 할 일 추가
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {userId && (
              <TodoList 
                todos={todos} 
                loading={loading}
                userId={userId}
                onDelete={handleTodoDeleted}
                onToggle={handleTodoToggle}
                onEdit={handleTodoEdit}
                onPin={handleTodoPin}
                onUp={handleTodoUp}
              />
            )}
          </div>
        </div>
      </main>

      {/* ToDo 추가 모달 */}
      {userId && (
        <TodoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          workspaceId={workspaceId}
          userId={userId}
          onTodoAdded={handleTodoAdded}
        />
      )}
    </div>
  )
}

