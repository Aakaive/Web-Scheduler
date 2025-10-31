'use client'

import { useState } from 'react'

interface SodeodCalendarProps {
  onDateSelect: (date: Date) => void
}

export default function SodeodCalendar({ onDateSelect }: SodeodCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

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

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square p-2 rounded-md border transition-all
                ${isCurrentMonthDate
                  ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600'
                  : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
                ${isTodayDate
                  ? 'ring-2 ring-blue-500 dark:ring-blue-400 font-semibold'
                  : ''
                }
              `}
            >
              <span className="text-sm">{date.getDate()}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

