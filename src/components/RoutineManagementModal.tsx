'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  getRoutinesByWorkspace, 
  createRoutine, 
  updateRoutine, 
  deleteRoutine,
  applyRoutineToMonth,
  removeRoutineFromMonth,
  Routine,
} from '@/lib/supabase'
import { useWorkspaceCategories } from '@/hooks/useWorkspaceCategories'

interface RoutineManagementModalProps {
  isOpen: boolean
  onClose: () => void
  workspaceId: string
  userId: string
  year: number
  month: number
  onRoutineApplied?: () => void
  categoryRefreshKey?: number
}

export default function RoutineManagementModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  year,
  month,
  onRoutineApplied,
  categoryRefreshKey,
}: RoutineManagementModalProps) {
  const { categories, loading: categoriesLoading } = useWorkspaceCategories(workspaceId, {
    enabled: isOpen,
    refreshKey: categoryRefreshKey,
  })
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const category of categories) {
      map.set(category.id, category.summary)
    }
    return map
  }, [categories])
  const firstCategoryId = categories[0]?.id ?? null
  const getCategoryLabel = (value?: number | null) => {
    if (value === null || value === undefined) {
      return '태그 없음'
    }
    return categoryMap.get(value) ?? '삭제된 태그'
  }

  const to12Hour = (hhmm: string | null) => {
    if (!hhmm) return { hour: 12, minute: 0, ampm: 'AM' as const }
    const [hh, mm] = hhmm.split(':').map(Number)
    if (hh === 0) return { hour: 12, minute: mm, ampm: 'AM' as const }
    if (hh < 12) return { hour: hh, minute: mm, ampm: 'AM' as const }
    if (hh === 12) return { hour: 12, minute: mm, ampm: 'PM' as const }
    return { hour: hh - 12, minute: mm, ampm: 'PM' as const }
  }

  const to24Hour = (hour: number, minute: number, ampm: 'AM' | 'PM'): string => {
    let h24 = hour
    if (ampm === 'PM' && hour !== 12) h24 = hour + 12
    if (ampm === 'AM' && hour === 12) h24 = 0
    const hh = String(h24).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    return `${hh}:${mm}:00`
  }

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

  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  
  const [title, setTitle] = useState<string>('')
  const [startHour, setStartHour] = useState<number>(9)
  const [startMinute, setStartMinute] = useState<number>(0)
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM')
  const [endHour, setEndHour] = useState<number>(12)
  const [endMinute, setEndMinute] = useState<number>(0)
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM')
  const [summary, setSummary] = useState<string>('')
  const [expression, setExpression] = useState<string>('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editStartHour, setEditStartHour] = useState<number>(9)
  const [editStartMinute, setEditStartMinute] = useState<number>(0)
  const [editStartAmPm, setEditStartAmPm] = useState<'AM' | 'PM'>('AM')
  const [editEndHour, setEditEndHour] = useState<number>(12)
  const [editEndMinute, setEditEndMinute] = useState<number>(0)
  const [editEndAmPm, setEditEndAmPm] = useState<'AM' | 'PM'>('PM')
  const [editSummary, setEditSummary] = useState<string>('')
  const [editExpression, setEditExpression] = useState<string>('')
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null)
  const [editSelectedDays, setEditSelectedDays] = useState<Set<number>>(new Set())
  const [includePastSelections, setIncludePastSelections] = useState<Record<string, boolean>>({})

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  useEffect(() => {
    if (isOpen) {
      fetchRoutines()
      setShowForm(false)
    }
  }, [isOpen, workspaceId, userId])

  useEffect(() => {
    if (!isOpen) return
    if (firstCategoryId && categoryId === null) {
      setCategoryId(firstCategoryId)
    }
    if (editingId && firstCategoryId && editCategoryId === null) {
      setEditCategoryId(firstCategoryId)
    }
  }, [isOpen, firstCategoryId, categoryId, editingId, editCategoryId])

  const fetchRoutines = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getRoutinesByWorkspace(workspaceId, userId)
      setRoutines(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (dayIndex: number) => {
    const newSet = new Set(selectedDays)
    if (newSet.has(dayIndex)) {
      newSet.delete(dayIndex)
    } else {
      newSet.add(dayIndex)
    }
    setSelectedDays(newSet)
  }

  const toggleEditDay = (dayIndex: number) => {
    const newSet = new Set(editSelectedDays)
    if (newSet.has(dayIndex)) {
      newSet.delete(dayIndex)
    } else {
      newSet.add(dayIndex)
    }
    setEditSelectedDays(newSet)
  }

  const handleAddClick = () => {
    setShowForm(true)
    setTitle('')
    setStartHour(9)
    setStartMinute(0)
    setStartAmPm('AM')
    setEndHour(12)
    setEndMinute(0)
    setEndAmPm('PM')
    setSummary('')
    setExpression('')
    setCategoryId(firstCategoryId)
    setSelectedDays(new Set())
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setTitle('')
    setStartHour(9)
    setStartMinute(0)
    setStartAmPm('AM')
    setEndHour(12)
    setEndMinute(0)
    setEndAmPm('PM')
    setSummary('')
    setExpression('')
    setCategoryId(firstCategoryId)
    setSelectedDays(new Set())
  }

  const handleFormSave = async () => {
    if (!title.trim()) {
      setError('루틴 이름을 입력해주세요.')
      return
    }
    if (selectedDays.size === 0) {
      setError('최소 1개 이상의 요일을 선택해주세요.')
      return
    }
    if (!categoryId) {
      setError('활동 태그를 선택해주세요.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      const startAt24 = to24Hour(startHour, startMinute, startAmPm)
      const endAt24 = to24Hour(endHour, endMinute, endAmPm)
      
      await createRoutine({
        workspace_id: workspaceId,
        user_id: userId,
        title: title.trim(),
        start_at: startAt24,
        end_at: endAt24,
        summary: summary || null,
        expression: expression || null,
        repeat_days: Array.from(selectedDays).sort((a, b) => a - b),
        category_id: categoryId,
      })

      setShowForm(false)
      handleFormCancel()
      await fetchRoutines()
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 생성에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const beginEdit = (routine: Routine) => {
    setEditingId(routine.id)
    setEditTitle(routine.title)
    const start12 = to12Hour(routine.start_at)
    const end12 = to12Hour(routine.end_at)
    setEditStartHour(start12.hour)
    setEditStartMinute(start12.minute)
    setEditStartAmPm(start12.ampm)
    setEditEndHour(end12.hour)
    setEditEndMinute(end12.minute)
    setEditEndAmPm(end12.ampm)
    setEditSummary(routine.summary ?? '')
    setEditExpression(routine.expression ?? '')
    setEditCategoryId(routine.category_id ?? firstCategoryId)
    setEditSelectedDays(new Set(routine.repeat_days))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditStartHour(9)
    setEditStartMinute(0)
    setEditStartAmPm('AM')
    setEditEndHour(12)
    setEditEndMinute(0)
    setEditEndAmPm('PM')
    setEditSummary('')
    setEditExpression('')
    setEditCategoryId(firstCategoryId)
    setEditSelectedDays(new Set())
  }

  const saveEdit = async (routineId: string) => {
    if (!editTitle.trim()) {
      setError('루틴 이름을 입력해주세요.')
      return
    }
    if (editSelectedDays.size === 0) {
      setError('최소 1개 이상의 요일을 선택해주세요.')
      return
    }
    if (!editCategoryId) {
      setError('활동 태그를 선택해주세요.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const startAt24 = to24Hour(editStartHour, editStartMinute, editStartAmPm)
      const endAt24 = to24Hour(editEndHour, editEndMinute, editEndAmPm)
      await updateRoutine(routineId, userId, {
        title: editTitle.trim(),
        start_at: startAt24,
        end_at: endAt24,
        summary: editSummary || null,
        expression: editExpression || null,
        repeat_days: Array.from(editSelectedDays).sort((a, b) => a - b),
        category_id: editCategoryId
      })
      cancelEdit()
      await fetchRoutines()
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (routineId: string, routineTitle: string) => {
    if (!confirm(`"${routineTitle}" 루틴을 삭제하시겠습니까?\n\n이미 생성된 SoD는 유지되며, routine_id만 해제됩니다.`)) {
      return
    }

    try {
      await deleteRoutine(routineId, userId)
      await fetchRoutines()
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 삭제에 실패했습니다.')
    }
  }

  const handleApply = async (routine: Routine, includePastDates: boolean) => {
    const dayNames = routine.repeat_days.map(d => weekDays[d]).join(', ')
    const applyRangeNote = includePastDates
      ? '이번 달 1일부터 월말까지 모든 날짜에 적용됩니다.'
      : '오늘부터 월말까지만 적용됩니다. (과거 날짜는 제외)'
    if (!confirm(`"${routine.title}" 루틴을 ${year}년 ${month + 1}월에 적용하시겠습니까?\n\n반복 요일: ${dayNames}\n\n※ ${applyRangeNote}`)) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      const count = await applyRoutineToMonth(routine, year, month, workspaceId, userId, includePastDates)
      alert(`${count}개의 SoD가 생성되었습니다. (${includePastDates ? '이번 달 전체' : '오늘부터 월말까지'})`)
      if (onRoutineApplied) {
        onRoutineApplied()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 적용에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (routine: Routine, includePastDates: boolean) => {
    const removeRangeNote = includePastDates
      ? '이번 달 1일부터 월말까지 모든 날짜의 루틴이 삭제됩니다.'
      : '내일 이후의 루틴만 삭제됩니다. (오늘과 과거 날짜는 유지됩니다)'
    if (!confirm(`"${routine.title}" 루틴을 ${year}년 ${month + 1}월에서 해제하시겠습니까?\n\n${removeRangeNote}`)) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      await removeRoutineFromMonth(routine.id, year, month, workspaceId, userId, includePastDates)
      alert(`루틴이 해제되었습니다. (${includePastDates ? '이번 달 전체 기간' : '내일 이후 날짜만 삭제'})`)
      if (onRoutineApplied) {
        onRoutineApplied()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '루틴 해제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return '-'
    return time.substring(0, 5)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl mx-4 shadow-xl max-h-[90vh] flex flex-col shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              루틴 관리
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {year}년 {month + 1}월
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

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

        {!categoriesLoading && categories.length === 0 && (
          <div className="mb-4 p-3 border border-amber-200 dark:border-amber-800 rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-900 dark:text-amber-100">
            태그가 비어있습니다. 태그 관리에서 최소 한 개 이상 등록해야 루틴을 만들 수 있어요.
          </div>
        )}

          <div className="flex justify-center mb-6">
            <button
              onClick={handleAddClick}
              disabled={showForm}
              className="w-12 h-12 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              aria-label="루틴 추가"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {showForm && (
            <div className="mb-6 p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  루틴 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="예: 아침 운동, 독서 시간"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  반복 요일 선택 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {weekDays.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`
                        flex-1 px-3 py-2 rounded-md border-2 font-medium transition-colors
                        ${selectedDays.has(index)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-blue-400 dark:hover:border-blue-500'
                        }
                      `}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

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
                  placeholder="루틴 내용 요약"
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
                  placeholder="루틴에 관한 상세 내용"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  활동 태그
                </label>
                <select
                  value={categoryId ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setCategoryId(value ? Number(value) : null)
                  }}
                  disabled={categories.length === 0}
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
                  disabled={saving || categories.length === 0}
                  className="px-4 py-2 text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
              루틴을 불러오는 중...
            </div>
          ) : routines.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              등록된 루틴이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  {editingId === routine.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">루틴 이름 *</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          placeholder="루틴 이름"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">반복 요일 *</label>
                        <div className="flex gap-1">
                          {weekDays.map((day, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => toggleEditDay(index)}
                              className={`
                                flex-1 px-2 py-1 rounded text-xs font-medium transition-colors
                                ${editSelectedDays.has(index)
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }
                              `}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>

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

                      <div>
                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">요약</label>
                        <input
                          type="text"
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">상세 내용</label>
                        <textarea
                          value={editExpression}
                          onChange={(e) => setEditExpression(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">활동 태그</label>
                        <select
                          value={editCategoryId ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setEditCategoryId(value ? Number(value) : null)
                          }}
                          disabled={categories.length === 0}
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-zinc-50 dark:disabled:bg-zinc-900/50"
                        >
                          {categories.length === 0 ? (
                            <option value="">등록된 태그가 없습니다</option>
                          ) : (
                            <>
                              {categories.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.summary}
                                </option>
                              ))}
                              {editCategoryId && !categoryMap.has(editCategoryId) && (
                                <option value={editCategoryId} disabled>
                                  삭제된 태그 (ID: {editCategoryId})
                                </option>
                              )}
                            </>
                          )}
                        </select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50"
                        >
                          취소
                        </button>
                        <button
                          onClick={() => saveEdit(routine.id)}
                          disabled={saving || categories.length === 0}
                          className="px-3 py-1.5 text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                            {routine.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                            <span>
                              {formatTime(routine.start_at)} ~ {formatTime(routine.end_at)}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                              {getCategoryLabel(routine.category_id)}
                            </span>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {routine.repeat_days.map((dayIdx) => (
                              <span
                                key={dayIdx}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              >
                                {weekDays[dayIdx]}
                              </span>
                            ))}
                          </div>
                          {routine.summary && (
                            <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                              {routine.summary}
                            </div>
                          )}
                          {routine.expression && (
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {routine.expression}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 ml-4">
                          <button
                            onClick={() => beginEdit(routine)}
                            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            aria-label="수정"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.9-9.9a1 1 0 000-1.414l-3.536-3.536a1 1 0 00-1.414 0l-9.9 9.9A1 1 0 004 15.414V20z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(routine.id, routine.title)}
                            className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                            checked={includePastSelections[routine.id] ?? false}
                            onChange={() =>
                              setIncludePastSelections((prev) => ({
                                ...prev,
                                [routine.id]: !(prev[routine.id] ?? false),
                              }))
                            }
                          />
                          <span>지난 날짜 포함 (이달 전체 적용/해제)</span>
                        </label>
                        <div className="flex gap-2">
                        <button
                          onClick={() => handleApply(routine, includePastSelections[routine.id] ?? false)}
                          disabled={saving}
                          className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          적용
                        </button>
                        <button
                          onClick={() => handleRemove(routine, includePastSelections[routine.id] ?? false)}
                          disabled={saving}
                          className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          해제
                        </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

