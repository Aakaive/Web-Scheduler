'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Category,
  createCategory,
  updateCategory,
} from '@/lib/supabase'
import { useWorkspaceCategories } from '@/hooks/useWorkspaceCategories'

interface CategoryManagementModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  onCategoriesUpdated?: () => void
}

export default function CategoryManagementModal({
  isOpen,
  onClose,
  workspaceId,
  onCategoriesUpdated,
}: CategoryManagementModalProps) {
  const {
    categories,
    loading,
    error: fetchError,
    refresh,
  } = useWorkspaceCategories(workspaceId, { enabled: isOpen })
  const [newSummary, setNewSummary] = useState('')
  const [editValues, setEditValues] = useState<Record<number, string>>({})
  const [savingId, setSavingId] = useState<number | 'new' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setNewSummary('')
    setActionError(null)
  }, [isOpen])

  useEffect(() => {
    setEditValues(
      categories.reduce<Record<number, string>>((acc, category) => {
        acc[category.id] = category.summary
        return acc
      }, {})
    )
  }, [categories])

  const handleCreate = async () => {
    if (!newSummary.trim()) {
      setActionError('새 속성 이름을 입력해주세요.')
      return
    }

    try {
      setSavingId('new')
      setActionError(null)
      await createCategory(workspaceId, newSummary.trim())
      setNewSummary('')
      await refresh()
      onCategoriesUpdated?.()
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : '속성을 추가하지 못했습니다.'
      )
    } finally {
      setSavingId(null)
    }
  }

  const handleUpdate = async (category: Category) => {
    const value = editValues[category.id]?.trim()
    if (!value) {
      setActionError('속성 이름을 입력해주세요.')
      return
    }
    if (value === category.summary) {
      setActionError('변경된 내용이 없습니다.')
      return
    }

    try {
      setSavingId(category.id)
      setActionError(null)
      await updateCategory(category.id, workspaceId, value)
      await refresh()
      onCategoriesUpdated?.()
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : '속성을 수정하지 못했습니다.'
      )
    } finally {
      setSavingId(null)
    }
  }

  const existingCount = useMemo(() => categories.length, [categories])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              속성 관리
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              워크스페이스별 사용자 정의 속성을 추가하거나 이름을 수정할 수 있어요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-2xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              새 속성 추가
            </h3>
            <div className="flex gap-3 flex-col sm:flex-row">
              <input
                type="text"
                placeholder="예: 개발, 회의, 운동"
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={savingId === 'new'}
              />
              <button
                onClick={handleCreate}
                disabled={savingId === 'new'}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                {savingId === 'new' ? '추가 중...' : '속성 추가'}
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                등록된 속성 ({existingCount})
              </h3>
            </div>

            {loading ? (
              <div className="py-10 text-center text-zinc-500 dark:text-zinc-400">
                속성을 불러오는 중입니다...
              </div>
            ) : categories.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 dark:text-zinc-400 text-sm border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
                아직 등록된 속성이 없습니다. 새 속성을 추가해보세요.
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const value = editValues[category.id] ?? ''
                  const hasChanged = value.trim() !== category.summary
                  return (
                    <div
                      key={category.id}
                      className="flex flex-col sm:flex-row gap-3 items-start sm:items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
                    >
                      <div className="flex-1 w-full">
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">
                          속성 이름
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [category.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          disabled={savingId === category.id}
                        />
                      </div>
                      <button
                        onClick={() => handleUpdate(category)}
                        disabled={!hasChanged || savingId === category.id}
                        className="w-full sm:w-auto rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:border-zinc-300 disabled:text-zinc-400 disabled:hover:bg-transparent px-4 py-2 text-sm font-semibold transition-colors"
                      >
                        {savingId === category.id ? '저장 중...' : '수정'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {fetchError && (
              <p className="text-sm text-red-500">{fetchError}</p>
            )}
          </section>

          {(actionError || fetchError) && (
            <div className="text-sm text-red-500">
              {actionError || fetchError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

