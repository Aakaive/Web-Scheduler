'use client'

import { useState, useEffect } from 'react'

interface SodeodModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  workspaceId: string
  userId: string
}

interface SodeodData {
  sod_time?: string | null
  eod_time?: string | null
  notes?: string | null
}

export default function SodeodModal({
  isOpen,
  onClose,
  date,
  workspaceId,
  userId,
}: SodeodModalProps) {
  const [sodTime, setSodTime] = useState<string>('')
  const [eodTime, setEodTime] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 날짜 문자열 (YYYY-MM-DD)
  const dateStr = date.toISOString().split('T')[0]

  useEffect(() => {
    if (isOpen) {
      fetchSodeodData()
    }
  }, [isOpen, dateStr])

  const fetchSodeodData = async () => {
    try {
      setLoading(true)
      setError(null)
      // TODO: Supabase에서 SoD/EoD 데이터 가져오기
      // 현재는 임시로 빈 데이터로 초기화
      setSodTime('')
      setEodTime('')
      setNotes('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      // TODO: Supabase에 SoD/EoD 데이터 저장
      // 임시로 콘솔에 출력
      console.log('SoD/EoD 데이터 저장:', {
        workspaceId,
        userId,
        date: dateStr,
        sodTime,
        eodTime,
        notes,
      })
      
      // 저장 성공 후 모달 닫기
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 날짜의 SoD/EoD 데이터를 삭제하시겠습니까?')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      // TODO: Supabase에서 SoD/EoD 데이터 삭제
      console.log('SoD/EoD 데이터 삭제:', { workspaceId, userId, date: dateStr })
      
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
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
        className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              SoD/EoD 관리
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

        {/* 본문 */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
              데이터를 불러오는 중...
            </div>
          ) : (
            <>
              {/* SoD (Start of Day) */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  SoD (Start of Day) 시간
                </label>
                <input
                  type="time"
                  value={sodTime}
                  onChange={(e) => setSodTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* EoD (End of Day) */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  EoD (End of Day) 시간
                </label>
                <input
                  type="time"
                  value={eodTime}
                  onChange={(e) => setEodTime(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  메모
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                  placeholder="일정에 대한 메모를 입력하세요..."
                />
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleDelete}
            disabled={saving || loading || (!sodTime && !eodTime && !notes)}
            className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            삭제
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

