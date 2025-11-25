'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSodsInRange, Sod } from '@/lib/supabase'

interface SodeodCalendarProps {
  onDateSelect: (date: Date) => void
  workspaceId: string
  userId: string
  onMonthChange?: (year: number, month: number) => void
  onRoutineModalOpen?: () => void
  onCategoryModalOpen?: () => void
}

type DayStats = { total: number; checked: number }

export default function SodeodCalendar({ onDateSelect, workspaceId, userId, onMonthChange, onRoutineModalOpen, onCategoryModalOpen }: SodeodCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statsByDate, setStatsByDate] = useState<Record<string, DayStats>>({})
  const [loadingStats, setLoadingStats] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(year, month)
    }
  }, [year, month, onMonthChange])

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  const calendarDays: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const toYmd = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isKoreanPublicHoliday = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const key = `${yyyy}-${mm}-${dd}`
    
    const fixedKey = `${mm}-${dd}`
    const fixed = new Set([
      '01-01',
      '03-01',
      '05-05',
      '06-06',
      '08-15',
      '10-03',
      '10-09',
      '12-25',
    ])
    
    const holidays2024 = new Set([
      '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12',
      '2024-05-15',
      '2024-09-16', '2024-09-17', '2024-09-18',
    ])
    
    const holidays2025 = new Set([
      '2025-01-28', '2025-01-29', '2025-01-30',
      '2025-05-05', '2025-05-06',
      '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
    ])
    
    const holidays2026 = new Set([
      '2026-02-16', '2026-02-17', '2026-02-18',
      '2026-05-24', '2026-05-25',
      '2026-09-24', '2026-09-25', '2026-09-26',
    ])
    
    const yearlyHolidays = yyyy === 2024 ? holidays2024
                         : yyyy === 2025 ? holidays2025
                         : yyyy === 2026 ? holidays2026
                         : new Set<string>()
    
    return fixed.has(fixedKey) || yearlyHolidays.has(key)
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!workspaceId || !userId) return
      try {
        setLoadingStats(true)
        const data = await getSodsInRange(workspaceId, userId, toYmd(startDate), toYmd(endDate))
        const next: Record<string, DayStats> = {}
        for (const sod of data) {
          const key = sod.date
          if (!next[key]) next[key] = { total: 0, checked: 0 }
          next[key].total += 1
          if (sod.check) next[key].checked += 1
        }
        setStatsByDate(next)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [year, month, workspaceId, userId])

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              오늘
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {onCategoryModalOpen && (
              <button
                onClick={onCategoryModalOpen}
                className="px-3 py-2 text-sm font-semibold border border-blue-200 dark:border-blue-500 text-blue-600 dark:text-blue-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                태그 관리
              </button>
            )}
            {onRoutineModalOpen && (
              <button
                onClick={onRoutineModalOpen}
                className="px-3 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors"
              >
                루틴 관리
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            aria-label="이전 월"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            aria-label="다음 월"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0
                ? 'text-red-600 dark:text-red-400'
                : index === 6
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0]
          const isCurrentMonthDate = isCurrentMonth(date)
          const isTodayDate = isToday(date)

          const dayKey = toYmd(date)
          const stat = statsByDate[dayKey] || { total: 0, checked: 0 }
          const percent = stat.total === 0 ? 0 : Math.round((stat.checked / stat.total) * 1000) / 10

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const currentDateOnly = new Date(date)
          currentDateOnly.setHours(0, 0, 0, 0)
          const isPastOrToday = currentDateOnly <= today

          const intensityClass = !isCurrentMonthDate
            ? ''
            : stat.total === 0 || !isPastOrToday
            ? ''
            : percent < 34
            ? 'bg-red-100/60 dark:bg-red-900/30'
            : percent < 67
            ? 'bg-orange-100/60 dark:bg-orange-900/30'
            : 'bg-green-100/60 dark:bg-green-900/30'

          const textColorClass = !isCurrentMonthDate || stat.total === 0 || !isPastOrToday
            ? 'text-zinc-500 dark:text-zinc-400'
            : percent < 34
            ? 'text-red-600 dark:text-red-400'
            : percent < 67
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-green-600 dark:text-green-500'

          const isHoliday = isCurrentMonthDate && isKoreanPublicHoliday(date)

          const percentDisplay = loadingStats && isCurrentMonthDate 
            ? '…' 
            : `${Math.round(percent)}%`

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square p-2 rounded-md border transition-all relative
                ${isCurrentMonthDate
                  ? `border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-blue-300 dark:hover:border-blue-600 ${intensityClass}`
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
                ${isTodayDate
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 font-semibold'
                  : ''
                }
              `}
            >
              <span className={`absolute top-1 left-1 text-xs ${isHoliday ? 'text-red-600 dark:text-red-400' : ''}`}>
                {date.getDate()}
              </span>
              {stat.total > 0 && isPastOrToday && (
                <span className={`flex items-center justify-center h-full px-1 font-medium ${textColorClass} text-[0.65rem] sm:text-xs`}>
                  {percentDisplay}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

