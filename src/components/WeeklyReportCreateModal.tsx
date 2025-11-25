import { useEffect, useMemo, useState } from "react";
import { Report, createReport } from "@/lib/supabase";

interface WeeklyReportCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (report: Report) => void;
  workspaceId: string;
  userId: string;
}

interface WeekOption {
  label: string;
  startDate: string;
  endDate: string;
  weekNumber: number;
}

const years = Array.from({ length: 5 }, (_, idx) => new Date().getFullYear() - 2 + idx);
const months = Array.from({ length: 12 }, (_, idx) => idx + 1);

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeeksForMonth = (year: number, month: number): WeekOption[] => {
  const firstDay = new Date(year, month - 1, 1);
  const weeks: WeekOption[] = [];
  const current = new Date(firstDay);

  while (current.getMonth() === month - 1) {
    if (current.getDay() === 1) {
      const startDate = new Date(current);
      const endDate = new Date(current);
      endDate.setDate(endDate.getDate() + 6);

      weeks.push({
        label: `${year}년 ${month}월 ${weeks.length + 1}주차 (${formatDate(startDate)} ~ ${formatDate(
          endDate
        )})`,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        weekNumber: weeks.length + 1,
      });

      current.setDate(current.getDate() + 7);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return weeks;
};

export default function WeeklyReportCreateModal({
  isOpen,
  onClose,
  onCreated,
  workspaceId,
  userId,
}: WeeklyReportCreateModalProps) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(null);
  const [loading, setLoading] = useState(false);
  const weekOptions = useMemo(
    () => getWeeksForMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  useEffect(() => {
    setSelectedWeek(weekOptions[0] ?? null);
  }, [weekOptions]);

  const handleCreate = async () => {
    if (!selectedWeek || loading) return;

    try {
      setLoading(true);
      const newReport = await createReport(workspaceId, userId, {
        start_date: selectedWeek.startDate,
        end_date: selectedWeek.endDate,
        week_number: selectedWeek.weekNumber,
      });
      onCreated(newReport);
    } catch (error) {
      console.error(error);
      alert("레포트를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">주간 레포트 생성</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col text-sm text-zinc-600 dark:text-zinc-400">
              연도
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm text-zinc-600 dark:text-zinc-400">
              월
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col text-sm text-zinc-600 dark:text-zinc-400">
            주차
            <select
              value={selectedWeek?.weekNumber ?? ""}
              onChange={(e) => {
                const week = weekOptions.find((option) => option.weekNumber === Number(e.target.value));
                setSelectedWeek(week ?? null);
              }}
              className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              {weekOptions.length === 0 ? (
                <option value="">해당 월에는 월요일이 없습니다.</option>
              ) : (
                weekOptions.map((week) => (
                  <option key={week.weekNumber} value={week.weekNumber}>
                    {week.label}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedWeek || loading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white text-sm font-semibold transition-colors"
          >
            {loading ? "생성 중..." : "레포트 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

