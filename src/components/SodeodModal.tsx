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
  // 24시간 형식(HH:MM)을 12시간 형식으로 변환
  const to12Hour = (hhmm: string | null) => {
    if (!hhmm) return { hour: 12, minute: 0, ampm: 'AM' as const }
    const [hh, mm] = hhmm.split(':').map(Number)
    if (hh === 0) return { hour: 12, minute: mm, ampm: 'AM' as const }
    if (hh < 12) return { hour: hh, minute: mm, ampm: 'AM' as const }
    if (hh === 12) return { hour: 12, minute: mm, ampm: 'PM' as const }
    return { hour: hh - 12, minute: mm, ampm: 'PM' as const }
  }

  // 12시간 형식을 24시간 형식(HH:MM:SS)으로 변환
  const to24Hour = (hour: number, minute: number, ampm: 'AM' | 'PM'): string => {
    let h24 = hour
    if (ampm === 'PM' && hour !== 12) h24 = hour + 12
    if (ampm === 'AM' && hour === 12) h24 = 0
    const hh = String(h24).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    return `${hh}:${mm}:00`
  }

  // 시간 선택 컴포넌트 (시/분/오전-오후)
  const TimeSelector = ({
    hour, minute, ampm,
    onHourChange, onMinuteChange, onAmPmChange,
    required = false
  }: {
    hour: number
    minute: number
    ampm: 'AM' | 'PM'
    onHourChange: (v: number) => void
    onMinuteChange: (v: number) => void
    onAmPmChange: (v: 'AM' | 'PM') => void
    required?: boolean
  }) => {
    return (
      <div className="flex gap-2">
        <select
          value={hour}
          onChange={(e) => onHourChange(Number(e.target.value))}
          required={required}
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}시</option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(e) => onMinuteChange(Number(e.target.value))}
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}분</option>
          ))}
        </select>
        <select
          value={ampm}
          onChange={(e) => onAmPmChange(e.target.value as 'AM' | 'PM')}
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>
      </div>
    )
  }

  const [sods, setSods] = useState<Sod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  // 입력 폼 상태 (12시간 형식)
  const [startHour, setStartHour] = useState<number>(9)
  const [startMinute, setStartMinute] = useState<number>(0)
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM')
  const [endHour, setEndHour] = useState<number>(12)
  const [endMinute, setEndMinute] = useState<number>(0)
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM')
  const [summary, setSummary] = useState<string>('')
  const [expression, setExpression] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartHour, setEditStartHour] = useState<number>(9)
  const [editStartMinute, setEditStartMinute] = useState<number>(0)
  const [editStartAmPm, setEditStartAmPm] = useState<'AM' | 'PM'>('AM')
  const [editEndHour, setEditEndHour] = useState<number>(12)
  const [editEndMinute, setEditEndMinute] = useState<number>(0)
  const [editEndAmPm, setEditEndAmPm] = useState<'AM' | 'PM'>('PM')
  const [editSummary, setEditSummary] = useState<string>('')
  const [editExpression, setEditExpression] = useState<string>('')
  const [copying, setCopying] = useState(false)

  // 날짜 문자열 (YYYY-MM-DD) - 로컬 시간대 기준
  const dateStr = (() => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

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
    setStartHour(9)
    setStartMinute(0)
    setStartAmPm('AM')
    setEndHour(12)
    setEndMinute(0)
    setEndAmPm('PM')
    setSummary('')
    setExpression('')
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setStartHour(9)
    setStartMinute(0)
    setStartAmPm('AM')
    setEndHour(12)
    setEndMinute(0)
    setEndAmPm('PM')
    setSummary('')
    setExpression('')
  }

  const handleFormSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const startAt24 = to24Hour(startHour, startMinute, startAmPm)
      const endAt24 = to24Hour(endHour, endMinute, endAmPm)
      
      await createSod({
        workspace_id: workspaceId,
        user_id: userId,
        date: dateStr,
        start_at: startAt24,
        end_at: endAt24,
        summary: summary || null,
        expression: expression || null,
        routine_id: null,
      })

      // 폼 초기화 및 숨김
      setShowForm(false)
      setStartHour(9)
      setStartMinute(0)
      setStartAmPm('AM')
      setEndHour(12)
      setEndMinute(0)
      setEndAmPm('PM')
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

  const beginEdit = (sod: Sod) => {
    setEditingId(sod.id)
    const start12 = to12Hour(sod.start_at)
    const end12 = to12Hour(sod.end_at)
    setEditStartHour(start12.hour)
    setEditStartMinute(start12.minute)
    setEditStartAmPm(start12.ampm)
    setEditEndHour(end12.hour)
    setEditEndMinute(end12.minute)
    setEditEndAmPm(end12.ampm)
    setEditSummary(sod.summary ?? '')
    setEditExpression(sod.expression ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditStartHour(9)
    setEditStartMinute(0)
    setEditStartAmPm('AM')
    setEditEndHour(12)
    setEditEndMinute(0)
    setEditEndAmPm('PM')
    setEditSummary('')
    setEditExpression('')
  }

  const saveEdit = async (sodId: string) => {
    try {
      setSaving(true)
      setError(null)
      const startAt24 = to24Hour(editStartHour, editStartMinute, editStartAmPm)
      const endAt24 = to24Hour(editEndHour, editEndMinute, editEndAmPm)
      await updateSod(sodId, userId, {
        start_at: startAt24,
        end_at: endAt24,
        summary: editSummary || null,
        expression: editExpression || null,
      })
      cancelEdit()
      await fetchSods()
    } catch (e) {
      setError(e instanceof Error ? e.message : '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const buildCopyText = () => {
    const lines: string[] = []
    lines.push('[SoD/EoD]')
    for (const sod of sods) {
      const status = sod.check ? '✅' : '❌'
      const start = formatTime(sod.start_at)
      const end = formatTime(sod.end_at)
      const timeRange = `${start}~${end}`
      const summaryText = sod.summary ? ` ${sod.summary}` : ''
      lines.push(`- ${status} ${timeRange}${summaryText}`)
    }
    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(buildCopyText())
    } catch (e) {
      setError(e instanceof Error ? e.message : '복사에 실패했습니다.')
    } finally {
      setTimeout(() => setCopying(false), 800)
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
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              aria-label="요약 복사"
              title="요약 복사"
            >
              {copying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6z" />
                </svg>
              )}
            </button>
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
              className="w-12 h-12 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
                <TimeSelector
                  hour={startHour}
                  minute={startMinute}
                  ampm={startAmPm}
                  onHourChange={setStartHour}
                  onMinuteChange={setStartMinute}
                  onAmPmChange={setStartAmPm}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  종료 시간
                </label>
                <TimeSelector
                  hour={endHour}
                  minute={endMinute}
                  ampm={endAmPm}
                  onHourChange={setEndHour}
                  onMinuteChange={setEndMinute}
                  onAmPmChange={setEndAmPm}
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
                  className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleFormSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {editingId === sod.id ? (
                        <div className="space-y-3">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">시작 시간 *</label>
                              <TimeSelector
                                hour={editStartHour}
                                minute={editStartMinute}
                                ampm={editStartAmPm}
                                onHourChange={setEditStartHour}
                                onMinuteChange={setEditStartMinute}
                                onAmPmChange={setEditStartAmPm}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">종료 시간</label>
                              <TimeSelector
                                hour={editEndHour}
                                minute={editEndMinute}
                                ampm={editEndAmPm}
                                onHourChange={setEditEndHour}
                                onMinuteChange={setEditEndMinute}
                                onAmPmChange={setEditEndAmPm}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">요약</label>
                            <input
                              type="text"
                              value={editSummary}
                              onChange={(e) => setEditSummary(e.target.value)}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                              placeholder="활동 내용 요약"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">상세 내용</label>
                            <textarea
                              value={editExpression}
                              onChange={(e) => setEditExpression(e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                              placeholder="활동에 관한 상세 내용"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => saveEdit(sod.id)}
                              disabled={saving}
                              className="px-4 py-2 text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {formatTime(sod.start_at)} ~ {formatTime(sod.end_at)}
                            </div>
                          </div>
                          {sod.summary && (
                            <div className={`text-sm font-semibold mb-1 ${
                              sod.summary.startsWith('(루틴)')
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}>
                              {sod.summary}
                            </div>
                          )}
                          {sod.expression && (
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                              {sod.expression}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* 삭제 버튼 */}
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => (editingId === sod.id ? cancelEdit() : beginEdit(sod))}
                        className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        aria-label="수정"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.9-9.9a1 1 0 000-1.414l-3.536-3.536a1 1 0 00-1.414 0l-9.9 9.9A1 1 0 004 15.414V20z" />
                        </svg>
                      </button>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

