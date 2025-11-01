'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSodsInRange, Sod } from '@/lib/supabase'

interface SodeodCalendarProps {
  onDateSelect: (date: Date) => void
  workspaceId: string
  userId: string
}

type DayStats = { total: number; checked: number }

export default function SodeodCalendar({ onDateSelect, workspaceId, userId }: SodeodCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statsByDate, setStatsByDate] = useState<Record<string, DayStats>>({})
  const [loadingStats, setLoadingStats] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 현재 월의 첫 번째 날과 마지막 날
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  // 달력 시작일 (첫 주의 일요일)
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  // 달력 종료일 (마지막 주의 토요일)
  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

  // 달력에 표시할 모든 날짜 생성
  const calendarDays: Date[] = []
  const current = new Date(startDate)
  while (current <= endDate) {
    calendarDays.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  // YYYY-MM-DD 헬퍼 (로컬 시간대 기준)
  const toYmd = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 대한민국 공휴일 판별 (양력 고정 공휴일 + 음력 공휴일 + 대체 공휴일)
  const isKoreanPublicHoliday = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const key = `${yyyy}-${mm}-${dd}`
    
    // 양력 고정 공휴일
    const fixedKey = `${mm}-${dd}`
    const fixed = new Set([
      '01-01', // 신정
      '03-01', // 삼일절
      '05-05', // 어린이날
      '06-06', // 현충일
      '08-15', // 광복절
      '10-03', // 개천절
      '10-09', // 한글날
      '12-25', // 성탄절
    ])
    
    // 2024-2026년 음력 공휴일 및 대체 공휴일 (설날, 추석, 부처님오신날 포함)
    const holidays2024 = new Set([
      // 설날 연휴 (2024.02.09-11, 토-월) + 대체공휴일 (2024.02.12, 화)
      '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12',
      // 부처님오신날 (2024.05.15, 수)
      '2024-05-15',
      // 추석 연휴 (2024.09.16-18, 월-수)
      '2024-09-16', '2024-09-17', '2024-09-18',
    ])
    
    const holidays2025 = new Set([
      // 설날 연휴 (2025.01.28-30, 화-목)
      '2025-01-28', '2025-01-29', '2025-01-30',
      // 부처님오신날 (2025.05.05, 월) - 어린이날과 겹침, 대체공휴일 (2025.05.06, 화)
      '2025-05-05', '2025-05-06',
      // 추석 연휴 (2025.10.05-07, 일-화) + 대체공휴일 (2025.10.08, 수)
      '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
    ])
    
    const holidays2026 = new Set([
      // 설날 연휴 (2026.02.16-18, 월-수)
      '2026-02-16', '2026-02-17', '2026-02-18',
      // 부처님오신날 (2026.05.24, 일) + 대체공휴일 (2026.05.25, 월)
      '2026-05-24', '2026-05-25',
      // 추석 연휴 (2026.09.24-26, 목-토)
      '2026-09-24', '2026-09-25', '2026-09-26',
    ])
    
    // 연도별 분기
    const yearlyHolidays = yyyy === 2024 ? holidays2024
                         : yyyy === 2025 ? holidays2025
                         : yyyy === 2026 ? holidays2026
                         : new Set<string>()
    
    return fixed.has(fixedKey) || yearlyHolidays.has(key)
  }

  // 월 변경 시 범위 내 SoD 통계 가져오기
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, workspaceId, userId])

  // 요일 레이블
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  // 이전 월로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  // 다음 월로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 날짜가 현재 월에 속하는지 확인
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  // 날짜가 오늘인지 확인
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
      {/* 헤더: 월/년도 및 네비게이션 */}
      <div className="flex items-center justify-between mb-6">
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

      {/* 요일 레이블 */}
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

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0]
          const isCurrentMonthDate = isCurrentMonth(date)
          const isTodayDate = isToday(date)

          const dayKey = toYmd(date)
          const stat = statsByDate[dayKey] || { total: 0, checked: 0 }
          const percent = stat.total === 0 ? 0 : Math.round((stat.checked / stat.total) * 1000) / 10

          // 색상 구간: SoD가 없으면 배경 없음, 있으면 달성률에 따라 낮음(빨강), 중간(주황), 높음(초록)
          const intensityClass = !isCurrentMonthDate
            ? ''
            : stat.total === 0
            ? ''
            : percent < 34
            ? 'bg-red-100/60 dark:bg-red-900/30'
            : percent < 67
            ? 'bg-orange-100/60 dark:bg-orange-900/30'
            : 'bg-green-100/60 dark:bg-green-900/30'

          // 텍스트 색상: 배경색과 같은 계통의 진한 색상
          const textColorClass = !isCurrentMonthDate || stat.total === 0
            ? 'text-zinc-500 dark:text-zinc-400'
            : percent < 34
            ? 'text-red-600 dark:text-red-400'
            : percent < 67
            ? 'text-orange-600 dark:text-orange-400'
            : 'text-green-600 dark:text-green-500'

          const isHoliday = isCurrentMonthDate && isKoreanPublicHoliday(date)

          // 달성률 표시: 항상 정수로 표시
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
              {/* 좌측 상단: 날짜 */}
              <span className={`absolute top-1 left-1 text-xs ${isHoliday ? 'text-red-600 dark:text-red-400' : ''}`}>
                {date.getDate()}
              </span>
              {/* 중앙: 퍼센트 (SoD가 있을 때만 표시) */}
              {stat.total > 0 && (
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

