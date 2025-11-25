'use client'

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import WeeklyReportCreateModal from "@/components/WeeklyReportCreateModal";
import {
  Report,
  ReportMetric,
  getReportById,
  getReportMetrics,
  getReportsByMonth,
  supabase,
  getPreviousWeekReport,
  getPreviousMonthReport,
  getPreviousMonthReportsWithWeekCount,
  getAggregatedMetricsFromReports,
} from "@/lib/supabase";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { getCategoryColor } from "@/lib/categoryColors";

const years = Array.from({ length: 5 }, (_, idx) => new Date().getFullYear() - 2 + idx);
const months = Array.from({ length: 12 }, (_, idx) => idx + 1);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
};

const formatReportLabel = (report: Report) => {
  const year = new Date(report.start_date).getFullYear();
  const month = new Date(report.start_date).getMonth() + 1;
  return `${year}년 ${month}월 ${report.week_number}주차`;
};

  const formatHours = (minutes: number) => (minutes / 60).toFixed(1);

  // hex 색상을 rgba로 변환 (투명도 포함)
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

export default function WeeklyReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId ?? "";
  const today = useMemo(() => new Date(), []);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [filterYear, setFilterYear] = useState(() => {
    const paramYear = searchParams?.get("year");
    const parsed = paramYear ? Number(paramYear) : NaN;
    return !Number.isNaN(parsed) ? parsed : today.getFullYear();
  });
  const [filterMonth, setFilterMonth] = useState(() => {
    const paramMonth = searchParams?.get("month");
    const parsed = paramMonth ? Number(paramMonth) : NaN;
    return !Number.isNaN(parsed) ? parsed : today.getMonth() + 1;
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedReportIds, setExpandedReportIds] = useState<number[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, ReportMetric[]>>({});
  const [metricsLoadingId, setMetricsLoadingId] = useState<number | null>(null);
  const [previousWeekMetricsMap, setPreviousWeekMetricsMap] = useState<Record<number, ReportMetric[]>>({});
  const [previousMonthMetricsMap, setPreviousMonthMetricsMap] = useState<Record<number, Array<{ category_id: number | null; minutes: number; rate: number }>>>({});
  const [previousMonthWeekCountMap, setPreviousMonthWeekCountMap] = useState<Record<number, number>>({});
  const [comparisonLoadingMap, setComparisonLoadingMap] = useState<Record<number, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingInitialExpandId, setPendingInitialExpandId] = useState<number | null>(() => {
    const param = searchParams?.get("reportId");
    const parsed = param ? Number(param) : null;
    return parsed && !Number.isNaN(parsed) ? parsed : null;
  });
  const { categories } = useWorkspaceCategories(workspaceId, { enabled: !!workspaceId });
  const categoryMeta = useMemo(() => {
    const map = new Map<number, string>();
    for (const category of categories) {
      map.set(category.id, category.summary);
    }
    return map;
  }, [categories]);
  const getCategoryLabel = (id?: number | null) => {
    if (id === null || id === undefined) {
      return "속성 없음";
    }
    return categoryMeta.get(id) ?? `삭제된 속성 (#${id})`;
  };
  const getColorForCategory = (id?: number | null) => getCategoryColor(id ?? null);

  useEffect(() => {
    const initUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    initUser();
  }, []);

  useEffect(() => {
    const paramYear = searchParams?.get("year");
    const paramMonth = searchParams?.get("month");
    const parsedYear = paramYear ? Number(paramYear) : NaN;
    const parsedMonth = paramMonth ? Number(paramMonth) : NaN;
    const resolvedYear = !Number.isNaN(parsedYear) ? parsedYear : today.getFullYear();
    const resolvedMonth = !Number.isNaN(parsedMonth) ? parsedMonth : today.getMonth() + 1;
    setFilterYear((prev) => (prev === resolvedYear ? prev : resolvedYear));
    setFilterMonth((prev) => (prev === resolvedMonth ? prev : resolvedMonth));
  }, [searchParams, today]);

  const syncFilter = useCallback(
    (year: number, month: number, options?: { preserveReportId?: boolean }) => {
      setFilterYear(year);
      setFilterMonth(month);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("year", String(year));
      params.set("month", String(month));
      if (!options?.preserveReportId) {
        params.delete("reportId");
      }
      const query = params.toString();
      router.replace(
        `/weekly-report/${workspaceId}${query ? `?${query}` : ""}`,
        { scroll: false }
      );
    },
    [router, searchParams, workspaceId]
  );

  const clearReportIdParam = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("reportId");
    const query = params.toString();
    router.replace(
      `/weekly-report/${workspaceId}${query ? `?${query}` : ""}`,
      { scroll: false }
    );
  }, [router, searchParams, workspaceId]);

  useEffect(() => {
    const loadReports = async () => {
      if (!workspaceId) return;
      try {
        setLoadingReports(true);
        const data = await getReportsByMonth(workspaceId, filterYear, filterMonth);
        setReports(data);
      } catch (error) {
        console.error(error);
        setReports([]);
      } finally {
        setLoadingReports(false);
      }
    };
    loadReports();
  }, [workspaceId, filterYear, filterMonth]);

  useEffect(() => {
    if (!pendingInitialExpandId || !workspaceId || !userId) return;
    let cancelled = false;

    const ensureFilterForPendingReport = async () => {
      try {
        const target = await getReportById(pendingInitialExpandId, workspaceId, userId);
        if (!target) {
          if (!cancelled) {
            setPendingInitialExpandId(null);
            clearReportIdParam();
          }
          return;
        }

        const start = new Date(target.start_date);
        const targetYear = start.getFullYear();
        const targetMonth = start.getMonth() + 1;

        if (!cancelled && (filterYear !== targetYear || filterMonth !== targetMonth)) {
          syncFilter(targetYear, targetMonth, { preserveReportId: true });
        }
      } catch (error) {
        console.error(error);
      }
    };

    ensureFilterForPendingReport();

    return () => {
      cancelled = true;
    };
  }, [pendingInitialExpandId, workspaceId, userId, filterYear, filterMonth, syncFilter, clearReportIdParam]);

  useEffect(() => {
    if (!pendingInitialExpandId || reports.length === 0) return;
    const targetId = pendingInitialExpandId;
    const exists = reports.some((report) => report.id === targetId);
    if (!exists) {
      return;
    }

    setExpandedReportIds((prev) =>
      prev.includes(targetId) ? prev : [...prev, targetId]
    );

    const loadDataForReport = async () => {
      // 메트릭 로드
      if (!metricsMap[targetId]) {
        try {
          setMetricsLoadingId(targetId);
          const metrics = await getReportMetrics(targetId);
          setMetricsMap((prev) => ({ ...prev, [targetId]: metrics }));
        } catch (error) {
          console.error(error);
        } finally {
          setMetricsLoadingId(null);
        }
      }

      // 비교 데이터 로드
      const report = reports.find(r => r.id === targetId);
      if (report && userId && !previousWeekMetricsMap[targetId] && !comparisonLoadingMap[targetId]) {
        try {
          setComparisonLoadingMap(prev => ({ ...prev, [targetId]: true }));
          
          const prevWeekReport = await getPreviousWeekReport(
            workspaceId,
            userId,
            report.start_date
          );
          
          if (prevWeekReport) {
            const prevWeekMetrics = await getReportMetrics(prevWeekReport.id);
            setPreviousWeekMetricsMap(prev => ({ ...prev, [targetId]: prevWeekMetrics }));
          } else {
            setPreviousWeekMetricsMap(prev => ({ ...prev, [targetId]: [] }));
          }
          
          const { reports: prevMonthReports, weekCount } = await getPreviousMonthReportsWithWeekCount(
            workspaceId,
            userId,
            report.start_date
          );
          
          setPreviousMonthWeekCountMap(prev => ({ ...prev, [targetId]: weekCount }));
          
          if (prevMonthReports.length > 0) {
            const reportIds = prevMonthReports.map(r => r.id);
            const aggregatedMetrics = await getAggregatedMetricsFromReports(reportIds);
            setPreviousMonthMetricsMap(prev => ({ ...prev, [targetId]: aggregatedMetrics }));
          } else {
            const prevMonthReport = await getPreviousMonthReport(
              workspaceId,
              userId,
              report.start_date,
              report.week_number
            );
            
            if (prevMonthReport) {
              const prevMonthMetrics = await getReportMetrics(prevMonthReport.id);
              setPreviousMonthMetricsMap(prev => ({ ...prev, [targetId]: prevMonthMetrics }));
              setPreviousMonthWeekCountMap(prev => ({ ...prev, [targetId]: 1 }));
            } else {
              setPreviousMonthMetricsMap(prev => ({ ...prev, [targetId]: [] }));
            }
          }
        } catch (error) {
          console.error("Error loading comparison data:", error);
          setPreviousWeekMetricsMap(prev => ({ ...prev, [targetId]: [] }));
          setPreviousMonthMetricsMap(prev => ({ ...prev, [targetId]: [] }));
        } finally {
          setComparisonLoadingMap(prev => ({ ...prev, [targetId]: false }));
        }
      }
    };

    loadDataForReport();
    setPendingInitialExpandId(null);
    clearReportIdParam();
  }, [pendingInitialExpandId, reports, metricsMap, clearReportIdParam]);

  const shiftMonth = (delta: number) => {
    const next = new Date(filterYear, filterMonth - 1 + delta, 1);
    syncFilter(next.getFullYear(), next.getMonth() + 1);
  };

  const goToPreviousMonth = () => shiftMonth(-1);
  const goToNextMonth = () => shiftMonth(1);

  const handleReportCreated = (report: Report) => {
    setIsModalOpen(false);
    setReports((prev) => [report, ...prev]);
    const start = new Date(report.start_date);
    syncFilter(start.getFullYear(), start.getMonth() + 1, { preserveReportId: true });

    const shouldNavigate = window.confirm("방금 생성한 레포트를 바로 작성하시겠어요?");
    if (shouldNavigate) {
      router.push(`/weekly-report/${workspaceId}/${report.id}`);
    } else {
      setExpandedReportIds((prev) =>
        prev.includes(report.id) ? prev : [...prev, report.id]
      );
    }
  };

  const handleToggleReport = async (reportId: number) => {
    const isCurrentlyExpanded = expandedReportIds.includes(reportId);
    setExpandedReportIds((prev) =>
      isCurrentlyExpanded ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );

    if (!isCurrentlyExpanded) {
      // 메트릭 로드
      if (!metricsMap[reportId]) {
        try {
          setMetricsLoadingId(reportId);
          const metrics = await getReportMetrics(reportId);
          setMetricsMap((prev) => ({ ...prev, [reportId]: metrics }));
        } catch (error) {
          console.error(error);
        } finally {
          setMetricsLoadingId(null);
        }
      }

      // 비교 데이터 로드
      const report = reports.find(r => r.id === reportId);
      if (report && userId && !previousWeekMetricsMap[reportId] && !comparisonLoadingMap[reportId]) {
        try {
          setComparisonLoadingMap(prev => ({ ...prev, [reportId]: true }));
          
          // 전주 레포트 조회
          const prevWeekReport = await getPreviousWeekReport(
            workspaceId,
            userId,
            report.start_date
          );
          
          if (prevWeekReport) {
            const prevWeekMetrics = await getReportMetrics(prevWeekReport.id);
            setPreviousWeekMetricsMap(prev => ({ ...prev, [reportId]: prevWeekMetrics }));
          } else {
            setPreviousWeekMetricsMap(prev => ({ ...prev, [reportId]: [] }));
          }
          
          // 전월 레포트들 조회
          const { reports: prevMonthReports, weekCount } = await getPreviousMonthReportsWithWeekCount(
            workspaceId,
            userId,
            report.start_date
          );
          
          setPreviousMonthWeekCountMap(prev => ({ ...prev, [reportId]: weekCount }));
          
          if (prevMonthReports.length > 0) {
            const reportIds = prevMonthReports.map(r => r.id);
            const aggregatedMetrics = await getAggregatedMetricsFromReports(reportIds);
            setPreviousMonthMetricsMap(prev => ({ ...prev, [reportId]: aggregatedMetrics }));
          } else {
            // 전월의 같은 주차 레포트 조회 시도
            const prevMonthReport = await getPreviousMonthReport(
              workspaceId,
              userId,
              report.start_date,
              report.week_number
            );
            
            if (prevMonthReport) {
              const prevMonthMetrics = await getReportMetrics(prevMonthReport.id);
              setPreviousMonthMetricsMap(prev => ({ ...prev, [reportId]: prevMonthMetrics }));
              setPreviousMonthWeekCountMap(prev => ({ ...prev, [reportId]: 1 }));
            } else {
              setPreviousMonthMetricsMap(prev => ({ ...prev, [reportId]: [] }));
            }
          }
        } catch (error) {
          console.error("Error loading comparison data:", error);
          setPreviousWeekMetricsMap(prev => ({ ...prev, [reportId]: [] }));
          setPreviousMonthMetricsMap(prev => ({ ...prev, [reportId]: [] }));
        } finally {
          setComparisonLoadingMap(prev => ({ ...prev, [reportId]: false }));
        }
      }
    }
  };

  const buildPieSegments = (metrics: ReportMetric[]) => {
    const totalMinutes = metrics.reduce((sum, metric) => sum + metric.minutes, 0);
    let offset = 0;
    return metrics.map((metric) => {
      const value = totalMinutes === 0 ? 0 : (metric.minutes / totalMinutes) * 100;
      const start = offset;
      offset += value;
      return {
        color: getColorForCategory(metric.category_id),
        value,
        start,
        end: start + value,
        categoryId: metric.category_id,
        label: getCategoryLabel(metric.category_id),
      };
    });
  };

  const buildPieBackground = (segments: ReturnType<typeof buildPieSegments>) => {
    if (segments.length === 0 || segments.every((segment) => segment.value === 0)) {
      return "#e4e4e7";
    }
    return `conic-gradient(${segments
      .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
      .join(", ")})`;
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="max-w-2xl mx-auto text-center rounded-xl border border-dashed border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 p-8">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              워크스페이스 정보를 확인할 수 없습니다.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              올바른 워크스페이스를 선택한 뒤 다시 시도해 주세요.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
            >
              홈으로 이동
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  주간 레포트
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  워크스페이스 ID: {workspaceId}
                </p>
              </div>
              <Link
                href={`/workspace/${workspaceId}`}
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0"
              >
                <span>←</span>
                <span className="hidden sm:inline whitespace-nowrap">워크스페이스로</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <aside className={`shrink-0 transition-all duration-300 ${isSidebarExpanded ? 'md:w-64' : 'md:w-20'} lg:w-64`}>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 md:sticky md:top-10">
                <div className="hidden md:flex items-center justify-between mb-2">
                  <h2 className={`text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-2 whitespace-nowrap ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                    메뉴
                  </h2>
                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`lg:hidden p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors ${!isSidebarExpanded ? 'mx-auto' : 'ml-auto'}`}
                    title={isSidebarExpanded ? '메뉴 접기' : '메뉴 펼치기'}
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform duration-300 ${isSidebarExpanded ? 'rotate-0' : 'rotate-180'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                <nav className="flex md:flex-col gap-2 md:gap-1">
                  <button
                    onClick={() => router.push(`/todo/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group text-left"
                    title="ToDo"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          ToDo
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          할 일 목록 관리
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push(`/reminder/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group text-left"
                    title="일정 리마인더"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5.464V3.099m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175C19 17.4 19 18 18.462 18H5.538C5 18 5 17.4 5 16.807c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.464ZM6 5 5 4M4 9H3m15-4 1-1m1 5h1M8.54 18a3.48 3.48 0 0 0 6.92 0H8.54Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          리마인더
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          알림 및 리마인더 설정
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push(`/workspace/${workspaceId}/sodeod`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group text-left"
                    title="SoD/EoD"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m11.5 11.5 2.071 1.994M4 10h5m11 0h-1.5M12 7V4M7 7V4m10 3V4m-7 13H8v-2l5.227-5.292a1.46 1.46 0 0 1 2.065 2.065L10 17Zm-5 3h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          SoD/EoD
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          시작/종료 일정 관리
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push(`/weekly-report/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 transition-all duration-200 group text-left"
                    title="주간 레포트"
                  >
                    <div className={`flex items-center justify-center h-full ${isSidebarExpanded ? 'md:flex-row md:gap-3 md:justify-start' : 'md:flex-col md:gap-2'} lg:flex-row lg:gap-3 lg:justify-start`}>
                      <div className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${isSidebarExpanded ? 'md:w-10' : 'md:w-full'} lg:w-10`}>
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors shrink-0">
                          <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm-1 9a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Zm2-5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 4a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                      <div className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${isSidebarExpanded ? 'md:text-left' : 'md:text-center'} lg:text-left ${!isSidebarExpanded ? 'md:hidden lg:block' : ''}`}>
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">
                          주간 레포트
                        </h3>
                        <p className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${isSidebarExpanded ? 'md:block' : 'md:hidden'} lg:block hidden`}>
                          주간 인사이트 & KPT 회고
                        </p>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={filterYear}
                      onChange={(e) => syncFilter(Number(e.target.value), filterMonth)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}년
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterMonth}
                      onChange={(e) => syncFilter(filterYear, Number(e.target.value))}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                    >
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}월
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={!userId}
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 px-4 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    주간 레포트 생성
                  </button>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    aria-label="이전 월"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {filterYear}년 {filterMonth}월
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    aria-label="다음 월"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {loadingReports ? (
                  <div className="flex items-center justify-center py-16 text-zinc-500 dark:text-zinc-400">
                    레포트를 불러오는 중입니다...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
                    선택한 기간에 해당하는 레포트가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => {
                      const isExpanded = expandedReportIds.includes(report.id);
                      const metrics = metricsMap[report.id] ?? [];
                      const sortedMetrics = [...metrics].sort((a, b) => b.minutes - a.minutes);
                      const pieSegments = sortedMetrics.length ? buildPieSegments(sortedMetrics) : [];
                      return (
                        <div
                          key={report.id}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900"
                        >
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                            onClick={() => handleToggleReport(report.id)}
                          >
                            <div>
                              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatReportLabel(report)}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatDate(report.start_date)} ~ {formatDate(report.end_date)}
                              </p>
                            </div>
                            <svg
                              className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-4 space-y-4">
                              {metricsLoadingId === report.id ? (
                                <div className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                  주간 분석 정보를 불러오는 중입니다...
                                </div>
                              ) : (
                                <>
                                  {metrics.length ? (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                                        <div>
                                          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                            카테고리별 활동 비중
                                          </h4>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            해당 주차 SoD 시간을 기준
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div
                                            className="w-24 h-24 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-inner"
                                            style={{
                                              background: buildPieBackground(pieSegments),
                                            }}
                                          />
                                          <div className="flex-1 space-y-1.5">
                                            <div className="grid grid-cols-3 text-xs text-zinc-500 dark:text-zinc-400 gap-2">
                                              <span className="text-zinc-600 dark:text-zinc-200">카테고리</span>
                                              <span className="text-center">시간</span>
                                              <span className="text-center">비중</span>
                                            </div>
                                            {sortedMetrics.map((metric) => {
                                              const segment = pieSegments.find(
                                                (item) => item.categoryId === metric.category_id
                                              );
                                              return (
                                                <div
                                                  key={metric.id}
                                                  className="grid grid-cols-3 text-xs text-zinc-600 dark:text-zinc-300 gap-2"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span
                                                      className="inline-block w-2 h-2 rounded-full"
                                                      style={{ backgroundColor: getColorForCategory(metric.category_id) }}
                                                    />
                                                    <span>{getCategoryLabel(metric.category_id)}</span>
                                                  </div>
                                                  <span className="text-center text-zinc-500 dark:text-zinc-400">
                                                    {formatHours(metric.minutes)}h
                                                  </span>
                                                  <span className="text-right text-zinc-500 dark:text-zinc-400">
                                                    {segment ? segment.value.toFixed(1) : "0.0"}%
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
                                        <div>
                                          <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                            카테고리별 달성률
                                          </h4>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            체크된 SoD 비율
                                          </p>
                                        </div>
                                        <div className="flex items-end gap-3 h-32">
                                          {sortedMetrics.map((metric) => (
                                            <div key={metric.id} className="flex-1 flex flex-col items-center gap-1">
                                              <div className="relative w-full h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                                                <div
                                                  className="absolute bottom-0 left-0 right-0 rounded-lg"
                                                  style={{
                                                    backgroundColor: getColorForCategory(metric.category_id),
                                                    height: `${Math.min(100, Math.max(0, metric.rate))}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="text-xs text-zinc-600 dark:text-zinc-300">
                                                {metric.rate.toFixed(0)}%
                                              </span>
                                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                {getCategoryLabel(metric.category_id)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
                                      주간 분석 결과가 없습니다. 상세 페이지에서 주간 분석을 실행해 보세요.
                                    </div>
                                  )}

                                  {/* 비교 분석 그래프 */}
                                  {metrics.length > 0 && (
                                    (previousWeekMetricsMap[report.id]?.length > 0 || previousMonthMetricsMap[report.id]?.length > 0) ? (
                                      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
                                        <div>
                                          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                                            기간별 비교 분석
                                          </h4>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            각 속성별 전월, 지난주, 이번주 비교 (시간은 주간 평균 기준)
                                          </p>
                                        </div>

                                        {comparisonLoadingMap[report.id] ? (
                                          <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                                            비교 데이터를 불러오는 중...
                                          </div>
                                        ) : (
                                          <div className="space-y-6">
                                            {(() => {
                                              const previousWeekMetrics = previousWeekMetricsMap[report.id] || [];
                                              const previousMonthMetrics = previousMonthMetricsMap[report.id] || [];
                                              const previousMonthWeekCount = previousMonthWeekCountMap[report.id] || 1;

                                              // 모든 카테고리 수집
                                              const allCategoryIds = new Set<number | null>();
                                              metrics.forEach(m => allCategoryIds.add(m.category_id));
                                              previousWeekMetrics.forEach(m => allCategoryIds.add(m.category_id));
                                              previousMonthMetrics.forEach(m => allCategoryIds.add(m.category_id));

                                              // 카테고리별 데이터 매핑
                                              const currentMap = new Map(metrics.map(m => [m.category_id, m]));
                                              const prevWeekMap = new Map(previousWeekMetrics.map(m => [m.category_id, m]));
                                              const prevMonthMap = new Map(previousMonthMetrics.map(m => [m.category_id, m]));

                                              // 최대 시간 계산 (스케일링용)
                                              const maxMinutesValues = Array.from(allCategoryIds).map(catId => {
                                                const current = currentMap.get(catId)?.minutes || 0;
                                                const prevWeek = prevWeekMap.get(catId)?.minutes || 0;
                                                const prevMonth = prevMonthMap.get(catId)?.minutes || 0;
                                                return Math.max(current, prevWeek, prevMonth / previousMonthWeekCount);
                                              });
                                              const maxMinutes = maxMinutesValues.length > 0 
                                                ? Math.max(...maxMinutesValues, 1)
                                                : 1;

                                              return Array.from(allCategoryIds).map(categoryId => {
                                                const current = currentMap.get(categoryId);
                                                const prevWeek = prevWeekMap.get(categoryId);
                                                const prevMonth = prevMonthMap.get(categoryId);

                                                // 전월은 주간 평균 계산
                                                const prevMonthWeeklyAvg = prevMonth 
                                                  ? prevMonth.minutes / previousMonthWeekCount 
                                                  : 0;
                                                const prevMonthRate = prevMonth ? prevMonth.rate : 0;

                                                const currentMinutes = current?.minutes || 0;
                                                const prevWeekMinutes = prevWeek?.minutes || 0;

                                                const currentRate = current?.rate || 0;
                                                const prevWeekRate = prevWeek?.rate || 0;

                                                const categoryColor = getColorForCategory(categoryId);
                                                
                                                // 연한색 계산
                                                const lightColor = categoryColor.startsWith('#')
                                                  ? hexToRgba(categoryColor, 0.3)
                                                  : categoryColor;

                                                const maxValue = Math.max(
                                                  currentMinutes, 
                                                  prevWeekMinutes, 
                                                  prevMonthWeeklyAvg, 
                                                  maxMinutes * 0.1,
                                                  1
                                                );

                                                return (
                                                  <div key={categoryId ?? 'none'} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-2">
                                                        <span
                                                          className="inline-block w-3 h-3 rounded-full"
                                                          style={{ backgroundColor: categoryColor }}
                                                        />
                                                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                                          {getCategoryLabel(categoryId)}
                                                        </span>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                      {/* 전월 */}
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-12 text-right">
                                                          전월
                                                        </span>
                                                        <div className="flex-1 relative h-5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                                          {prevMonthWeeklyAvg > 0 ? (
                                                            <div
                                                              className="h-full flex transition-all duration-300"
                                                              style={{
                                                                width: `${(prevMonthWeeklyAvg / maxValue) * 100}%`,
                                                              }}
                                                            >
                                                              {/* 달성 부분 */}
                                                              <div
                                                                className="h-full flex items-center pl-1 relative"
                                                                style={{
                                                                  width: `${Math.min(100, Math.max(0, prevMonthRate))}%`,
                                                                  backgroundColor: categoryColor,
                                                                }}
                                                              >
                                                                {prevMonthRate > 0 && (
                                                                  <span className="text-[9px] font-medium text-white dark:text-zinc-900 whitespace-nowrap">
                                                                    {formatHours(prevMonthWeeklyAvg * (prevMonthRate / 100))}h
                                                                  </span>
                                                                )}
                                                              </div>
                                                              {/* 미달성 부분 */}
                                                              {prevMonthRate < 100 && (
                                                                <div
                                                                  className="h-full flex-1"
                                                                  style={{
                                                                    backgroundColor: lightColor,
                                                                  }}
                                                                />
                                                              )}
                                                              {/* 시간 표시 */}
                                                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-medium text-zinc-700 dark:text-zinc-200">
                                                                {formatHours(prevMonthWeeklyAvg)}h
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500">
                                                              -
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* 지난주 */}
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-12 text-right">
                                                          지난주
                                                        </span>
                                                        <div className="flex-1 relative h-5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                                          {prevWeekMinutes > 0 ? (
                                                            <div
                                                              className="h-full flex transition-all duration-300"
                                                              style={{
                                                                width: `${(prevWeekMinutes / maxValue) * 100}%`,
                                                              }}
                                                            >
                                                              {/* 달성 부분 */}
                                                              <div
                                                                className="h-full flex items-center pl-1 relative"
                                                                style={{
                                                                  width: `${Math.min(100, Math.max(0, prevWeekRate))}%`,
                                                                  backgroundColor: categoryColor,
                                                                }}
                                                              >
                                                                {prevWeekRate > 0 && (
                                                                  <span className="text-[9px] font-medium text-white dark:text-zinc-900 whitespace-nowrap">
                                                                    {formatHours(prevWeekMinutes * (prevWeekRate / 100))}h
                                                                  </span>
                                                                )}
                                                              </div>
                                                              {/* 미달성 부분 */}
                                                              {prevWeekRate < 100 && (
                                                                <div
                                                                  className="h-full flex-1"
                                                                  style={{
                                                                    backgroundColor: lightColor,
                                                                  }}
                                                                />
                                                              )}
                                                              {/* 시간 표시 */}
                                                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-medium text-zinc-700 dark:text-zinc-200">
                                                                {formatHours(prevWeekMinutes)}h
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500">
                                                              -
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* 이번주 */}
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-12 text-right">
                                                          이번주
                                                        </span>
                                                        <div className="flex-1 relative h-5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                                          {currentMinutes > 0 ? (
                                                            <div
                                                              className="h-full flex transition-all duration-300"
                                                              style={{
                                                                width: `${(currentMinutes / maxValue) * 100}%`,
                                                              }}
                                                            >
                                                              {/* 달성 부분 */}
                                                              <div
                                                                className="h-full flex items-center pl-1 relative"
                                                                style={{
                                                                  width: `${Math.min(100, Math.max(0, currentRate))}%`,
                                                                  backgroundColor: categoryColor,
                                                                }}
                                                              >
                                                                {currentRate > 0 && (
                                                                  <span className="text-[9px] font-medium text-white dark:text-zinc-900 whitespace-nowrap">
                                                                    {formatHours(currentMinutes * (currentRate / 100))}h
                                                                  </span>
                                                                )}
                                                              </div>
                                                              {/* 미달성 부분 */}
                                                              {currentRate < 100 && (
                                                                <div
                                                                  className="h-full flex-1"
                                                                  style={{
                                                                    backgroundColor: lightColor,
                                                                  }}
                                                                />
                                                              )}
                                                              {/* 시간 표시 */}
                                                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-medium text-zinc-700 dark:text-zinc-200">
                                                                {formatHours(currentMinutes)}h
                                                              </span>
                                                            </div>
                                                          ) : (
                                                            <span className="absolute inset-0 flex items-center justify-center text-[9px] text-zinc-400 dark:text-zinc-500">
                                                              -
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    ) : null
                                  )}
                                </>
                              )}

                              <div>
                                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Keep</h4>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                                  {report.kpt_keep || "작성된 내용이 없습니다."}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Problem</h4>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                                  {report.kpt_problem || "작성된 내용이 없습니다."}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Try</h4>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                                  {report.kpt_try || "작성된 내용이 없습니다."}
                                </p>
                              </div>
                              <div className="flex items-center justify-end">
                                <button
                                  onClick={() => router.push(`/weekly-report/${workspaceId}/${report.id}`)}
                                  className="px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                                >
                                  레포트 작성/수정 →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {userId && (
        <WeeklyReportCreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={handleReportCreated}
          workspaceId={workspaceId}
          userId={userId}
        />
      )}
    </div>
  );
}
