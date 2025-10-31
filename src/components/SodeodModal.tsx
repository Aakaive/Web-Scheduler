'use client'

import { useState, useEffect } from 'react'
import { supabase, getSodsByDate, createSod, updateSod, deleteSod, Sod } from '@/lib/supabase'

interface SodeodModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  workspaceId: string
  userId: string
}

export default function SodeodModal({
  isOpen,
  onClose,
  date,
  workspaceId,
  userId,
}: SodeodModalProps) {
  const [sods, setSods] = useState<Sod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  // 입력 폼 상태
  const [startAt, setStartAt] = useState<string>('')
  const [endAt, setEndAt] = useState<string>('')
  const [summary, setSummary] = useState<string>('')
  const [expression, setExpression] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // 날짜 문자열 (YYYY-MM-DD)
  const dateStr = date.toISOString().split('T')[0]

  useEffect(() => {
    if (isOpen) {
      fetchSods()
      setShowForm(false)
    }
  }, [isOpen, dateStr, workspaceId, userId])

  const fetchSods = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSodsByDate(workspaceId, userId, dateStr)
      setSods(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddClick = () => {
    setShowForm(true)
    // 폼 초기화
    setStartAt('')
    setEndAt('')
    setSummary('')
    setExpression('')
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setStartAt('')
    setEndAt('')
    setSummary('')
    setExpression('')
  }

  const handleFormSave = async () => {
    if (!startAt) {
      setError('시작 시간을 입력해주세요.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      await createSod({
        workspace_id: workspaceId,
        user_id: userId,
        date: dateStr,
        start_at: startAt,
        end_at: endAt || null,
        summary: summary || null,
        expression: expression || null,
      })

      // 폼 초기화 및 숨김
      setShowForm(false)
      setStartAt('')
      setEndAt('')
      setSummary('')
      setExpression('')
      
      // SoD 리스트 새로고침
      await fetchSods()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckChange = async (sodId: string, checked: boolean) => {
    try {
      await updateSod(sodId, userId, { check: checked })
      // 리스트 새로고침
      await fetchSods()
    } catch (e) {
      setError(e instanceof Error ? e.message : '체크 상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (sodId: string) => {
    if (!confirm('이 SoD를 삭제하시겠습니까?')) {
      return
    }

    try {
      await deleteSod(sodId, userId)
      await fetchSods()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return '-'
    // HH:MM:SS 형식을 HH:MM으로 변환
    return time.substring(0, 5)
  }

  if (!isOpen) return null

  const formattedDate = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] flex flex-col shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              SoD 관리
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {formattedDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 추가 버튼 */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleAddClick}
              disabled={showForm}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              aria-label="SoD 추가"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* 입력 폼 */}
          {showForm && (
            <div className="mb-6 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  시작 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  요약 (Summary)
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="활동 내용 요약"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  상세 내용 (Expression)
                </label>
                <textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                  placeholder="활동에 관한 상세 내용"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleFormCancel}
                  disabled={saving}
                  className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleFormSave}
                  disabled={saving || !startAt}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {/* SoD 리스트 */}
          {loading ? (
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
              데이터를 불러오는 중...
            </div>
          ) : sods.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              등록된 SoD가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {sods.map((sod) => (
                <div
                  key={sod.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${sod.check
                      ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* 체크박스 */}
                    <input
                      type="checkbox"
                      checked={sod.check}
                      onChange={(e) => handleCheckChange(sod.id, e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-green-600 focus:ring-green-500 dark:focus:ring-green-400 cursor-pointer"
                    />

                    {/* 내용 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {formatTime(sod.start_at)} ~ {formatTime(sod.end_at)}
                        </div>
                      </div>
                      
                      {sod.summary && (
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                          {sod.summary}
                        </div>
                      )}
                      
                      {sod.expression && (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                          {sod.expression}
                        </div>
                      )}
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(sod.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      aria-label="삭제"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

