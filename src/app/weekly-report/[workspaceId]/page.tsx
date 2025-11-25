'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import WeeklyReportCreateModal from "@/components/WeeklyReportCreateModal";
import { Report, ReportMetric, getReportMetrics, getReportsByMonth, supabase } from "@/lib/supabase";
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

export default function WeeklyReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId ?? "";
  const today = useMemo(() => new Date(), []);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [filterYear, setFilterYear] = useState(today.getFullYear());
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedReportIds, setExpandedReportIds] = useState<number[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, ReportMetric[]>>({});
  const [metricsLoadingId, setMetricsLoadingId] = useState<number | null>(null);
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
    if (!pendingInitialExpandId || reports.length === 0) return;
    const targetId = pendingInitialExpandId;
    const exists = reports.some((report) => report.id === targetId);
    if (!exists) {
      setPendingInitialExpandId(null);
      router.replace(`/weekly-report/${workspaceId}`);
      return;
    }

    setExpandedReportIds((prev) =>
      prev.includes(targetId) ? prev : [...prev, targetId]
    );

    if (!metricsMap[targetId]) {
      (async () => {
        try {
          setMetricsLoadingId(targetId);
          const metrics = await getReportMetrics(targetId);
          setMetricsMap((prev) => ({ ...prev, [targetId]: metrics }));
        } catch (error) {
          console.error(error);
        } finally {
          setMetricsLoadingId(null);
        }
      })();
    }

    setPendingInitialExpandId(null);
    router.replace(`/weekly-report/${workspaceId}`);
  }, [pendingInitialExpandId, reports, workspaceId, router, metricsMap]);

  const handleReportCreated = (report: Report) => {
    setIsModalOpen(false);
    setReports((prev) => [report, ...prev]);

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

    if (!isCurrentlyExpanded && !metricsMap[reportId]) {
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
                      onChange={(e) => setFilterYear(Number(e.target.value))}
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
                      onChange={(e) => setFilterMonth(Number(e.target.value))}
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
                      const pieSegments = metrics.length ? buildPieSegments(metrics) : [];
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
                                            {metrics.map((metric) => {
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
                                          {metrics.map((metric) => (
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
