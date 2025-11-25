'use client'

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Report,
  ReportMetric,
  ReportMetricInput,
  Sod,
  getReportById,
  getReportMetrics,
  getSodsInRange,
  replaceReportMetrics,
  supabase,
  updateReport,
} from "@/lib/supabase";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { getCategoryColor } from "@/lib/categoryColors";

export default function WeeklyReportDetailPage() {
  const params = useParams<{ workspaceId: string; reportId: string }>();
  const workspaceId = params?.workspaceId ?? "";
  const reportId = Number(params?.reportId ?? "");
  const router = useRouter();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    kpt_keep: "",
    kpt_problem: "",
    kpt_try: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const weekLabel = useMemo(() => {
    if (!report) return "";
    const startDate = new Date(report.start_date);
    return `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ${report.week_number}주차`;
  }, [report]);

  useEffect(() => {
    const initUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    initUser();
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      if (!userId || !workspaceId || !reportId || Number.isNaN(reportId)) return;
      try {
        setLoading(true);
        const data = await getReportById(reportId, workspaceId, userId);
        setReport(data);
        setFormState({
          kpt_keep: data?.kpt_keep ?? "",
          kpt_problem: data?.kpt_problem ?? "",
          kpt_try: data?.kpt_try ?? "",
        });
        setIsDirty(false);
      } catch (error) {
        console.error(error);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [userId, workspaceId, reportId]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!reportId) return;
      try {
        const data = await getReportMetrics(reportId);
        setMetrics(data);
      } catch (error) {
        console.error(error);
      }
    };
    loadMetrics();
  }, [reportId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm("작성 중인 내용이 사라질 수 있습니다. 이동하시겠어요?");
  }, [isDirty]);

  const safeNavigate = (path: string) => {
    if (confirmNavigation()) {
      router.push(path);
    }
  };

  const handleInputChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!userId || !workspaceId || !reportId) return;
    try {
      setSaving(true);
      const updated = await updateReport(reportId, workspaceId, userId, {
        kpt_keep: formState.kpt_keep,
        kpt_problem: formState.kpt_problem,
        kpt_try: formState.kpt_try,
      });
      setReport(updated);
      setIsDirty(false);
      alert("레포트를 저장했습니다.");
      router.push(`/weekly-report/${workspaceId}?reportId=${reportId}`);
    } catch (error) {
      console.error(error);
      alert("레포트를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirmNavigation()) {
      router.push(`/weekly-report/${workspaceId}`);
    }
  };

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

  const computeMinutes = (sod: Sod) => {
    if (!sod.start_at || !sod.end_at) return 0;
    const [startHour, startMin] = sod.start_at.split(":").map(Number);
    const [endHour, endMin] = sod.end_at.split(":").map(Number);
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    return Math.max(0, end - start);
  };

  const formatHours = (minutes: number) => (minutes / 60).toFixed(1);

  const handleAnalyze = async () => {
    if (!report || !userId) return;
    try {
      setAnalysisLoading(true);
      const sods = await getSodsInRange(
        report.workspace_id,
        userId,
        report.start_date,
        report.end_date
      );

      const knownCategoryIds = new Set(categories.map((category) => category.id));
      const extraCategoryIds = new Set<number>();
      for (const sod of sods) {
        if (sod.category_id && !knownCategoryIds.has(sod.category_id)) {
          extraCategoryIds.add(sod.category_id);
        }
      }

      const categoryIdList = [
        ...Array.from(knownCategoryIds),
        ...Array.from(extraCategoryIds),
      ];

      if (categoryIdList.length === 0) {
        alert("분석할 수 있는 속성이 없습니다. 먼저 속성을 추가해주세요.");
        return;
      }

      const metricsInput = categoryIdList
        .map((categoryId) => {
          const group = sods.filter((sod) => sod.category_id === categoryId);
          const totalMinutes = group.reduce((sum, sod) => sum + computeMinutes(sod), 0);
          const completed = group.filter((sod) => sod.check).length;
          const rate = group.length === 0 ? 0 : Math.round((completed / group.length) * 100);
          return {
            category_id: categoryId,
            minutes: totalMinutes,
            rate,
          };
        })
        .filter((metric) => metric.minutes > 0 || metric.rate > 0);

      const saved = await replaceReportMetrics(report.id, metricsInput);
      setMetrics(saved);
    } catch (error) {
      console.error(error);
      alert("주간 분석을 수행하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const totalMinutes = metrics.reduce((sum, metric) => sum + metric.minutes, 0);
  const pieSegments = metrics.map((metric) => {
    const percentage = totalMinutes === 0 ? 0 : (metric.minutes / totalMinutes) * 100;
    return {
      color: getColorForCategory(metric.category_id),
      value: Number(percentage.toFixed(2)),
      categoryId: metric.category_id,
      label: getCategoryLabel(metric.category_id),
      minutes: metric.minutes,
    };
  });

  const pieBackground =
    pieSegments.length === 0
      ? "#e4e4e7"
      : `conic-gradient(${pieSegments
          .map(
            (segment, idx) =>
              `${segment.color} ${
                idx === 0
                  ? 0
                  : pieSegments.slice(0, idx).reduce((sum, item) => sum + item.value, 0)
              }% ${pieSegments
                .slice(0, idx + 1)
                .reduce((sum, item) => sum + item.value, 0)}%`
          )
          .join(", ")})`;

  if (!workspaceId || Number.isNaN(reportId)) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="text-center text-zinc-600 dark:text-zinc-300">
            유효하지 않은 레포트 경로입니다.
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="text-center text-zinc-600 dark:text-zinc-300">
            레포트를 불러오는 중입니다...
          </div>
        </main>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
        <main className="container mx-auto py-10 px-4">
          <div className="text-center text-zinc-600 dark:text-zinc-300">
            레포트를 찾을 수 없습니다.
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
                  주간 레포트 작성
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {weekLabel} · {new Date(report.start_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ~{" "}
                  {new Date(report.end_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => safeNavigate(`/weekly-report/${workspaceId}`)}
                className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1 shrink-0"
              >
                ← 목록으로
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <aside className={`shrink-0 transition-all duration-300 ${isSidebarExpanded ? "md:w-64" : "md:w-20"} lg:w-64`}>
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 md:sticky md:top-10">
                <div className="hidden md:flex items-center justify-between mb-2">
                  <h2
                    className={`text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-2 whitespace-nowrap ${
                      !isSidebarExpanded ? "md:hidden lg:block" : ""
                    }`}
                  >
                    메뉴
                  </h2>
                  <button
                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    className={`lg:hidden p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors ${
                      !isSidebarExpanded ? "mx-auto" : "ml-auto"
                    }`}
                    title={isSidebarExpanded ? "메뉴 접기" : "메뉴 펼치기"}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${isSidebarExpanded ? "rotate-0" : "rotate-180"}`}
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
                    onClick={() => safeNavigate(`/todo/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group text-left"
                    title="ToDo"
                  >
                    <div
                      className={`flex items-center justify-center h-full ${
                        isSidebarExpanded ? "md:flex-row md:gap-3 md:justify-start" : "md:flex-col md:gap-2"
                      } lg:flex-row lg:gap-3 lg:justify-start`}
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${
                          isSidebarExpanded ? "md:w-10" : "md:w-full"
                        } lg:w-10`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors shrink-0">
                          <svg
                            className="w-6 h-6 text-purple-600 dark:text-purple-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m8.032 12 1.984 1.984 4.96-4.96m4.55 5.272.893-.893a1.984 1.984 0 0 0 0-2.806l-.893-.893a1.984 1.984 0 0 1-.581-1.403V7.04a1.984 1.984 0 0 0-1.984-1.984h-1.262a1.983 1.983 0 0 1-1.403-.581l-.893-.893a1.984 1.984 0 0 0-2.806 0l-.893.893a1.984 1.984 0 0 1-1.403.581H7.04A1.984 1.984 0 0 0 5.055 7.04v1.262c0 .527-.209 1.031-.581 1.403l-.893.893a1.984 1.984 0 0 0 0 2.806l.893.893c.372.372.581.876.581 1.403v1.262a1.984 1.984 0 0 0 1.984 1.984h1.262c.527 0 1.031.209 1.403.581l.893.893a1.984 1.984 0 0 0 2.806 0l.893-.893a1.985 1.985 0 0 1 1.403-.581h1.262a1.984 1.984 0 0 0 1.984-1.984V15.7c0-.527.209-1.031.581-1.403Z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${
                          isSidebarExpanded ? "md:text-left" : "md:text-center"
                        } lg:text-left ${!isSidebarExpanded ? "md:hidden lg:block" : ""}`}
                      >
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">ToDo</h3>
                        <p
                          className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${
                            isSidebarExpanded ? "md:block" : "md:hidden"
                          } lg:block hidden`}
                        >
                          할 일 목록 관리
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => safeNavigate(`/reminder/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group text-left"
                    title="일정 리마인더"
                  >
                    <div
                      className={`flex items-center justify-center h-full ${
                        isSidebarExpanded ? "md:flex-row md:gap-3 md:justify-start" : "md:flex-col md:gap-2"
                      } lg:flex-row lg:gap-3 lg:justify-start`}
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${
                          isSidebarExpanded ? "md:w-10" : "md:w-full"
                        } lg:w-10`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors shrink-0">
                          <svg
                            className="w-6 h-6 text-green-600 dark:text-green-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 5.464V3.099m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175C19 17.4 19 18 18.462 18H5.538C5 18 5 17.4 5 16.807c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.464ZM6 5 5 4M4 9H3m15-4 1-1m1 5h1M8.54 18a3.48 3.48 0 0 0 6.92 0H8.54Z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${
                          isSidebarExpanded ? "md:text-left" : "md:text-center"
                        } lg:text-left ${!isSidebarExpanded ? "md:hidden lg:block" : ""}`}
                      >
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">리마인더</h3>
                        <p
                          className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${
                            isSidebarExpanded ? "md:block" : "md:hidden"
                          } lg:block hidden`}
                        >
                          알림 및 리마인더 설정
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => safeNavigate(`/workspace/${workspaceId}/sodeod`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group text-left"
                    title="SoD/EoD"
                  >
                    <div
                      className={`flex items-center justify-center h-full ${
                        isSidebarExpanded ? "md:flex-row md:gap-3 md:justify-start" : "md:flex-col md:gap-2"
                      } lg:flex-row lg:gap-3 lg:justify-start`}
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${
                          isSidebarExpanded ? "md:w-10" : "md:w-full"
                        } lg:w-10`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors shrink-0">
                          <svg
                            className="w-6 h-6 text-blue-600 dark:text-blue-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m11.5 11.5 2.071 1.994M4 10h5m11 0h-1.5M12 7V4M7 7V4m10 3V4m-7 13H8v-2l5.227-5.292a1.46 1.46 0 0 1 2.065 2.065L10 17Zm-5 3h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${
                          isSidebarExpanded ? "md:text-left" : "md:text-center"
                        } lg:text-left ${!isSidebarExpanded ? "md:hidden lg:block" : ""}`}
                      >
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">SoD/EoD</h3>
                        <p
                          className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${
                            isSidebarExpanded ? "md:block" : "md:hidden"
                          } lg:block hidden`}
                        >
                          시작/종료 일정 관리
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => safeNavigate(`/weekly-report/${workspaceId}`)}
                    className="flex-1 md:flex-initial md:w-full md:h-[70px] p-3 rounded-lg border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 transition-all duration-200 group text-left"
                    title="주간 레포트"
                  >
                    <div
                      className={`flex items-center justify-center h-full ${
                        isSidebarExpanded ? "md:flex-row md:gap-3 md:justify-start" : "md:flex-col md:gap-2"
                      } lg:flex-row lg:gap-3 lg:justify-start`}
                    >
                      <div
                        className={`flex items-center justify-center shrink-0 w-10 sm:w-auto ${
                          isSidebarExpanded ? "md:w-10" : "md:w-full"
                        } lg:w-10`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors shrink-0">
                          <svg
                            className="w-6 h-6 text-amber-600 dark:text-amber-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm-1 9a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Zm2-5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 4a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`flex-1 min-w-0 overflow-hidden text-center hidden sm:block ${
                          isSidebarExpanded ? "md:text-left" : "md:text-center"
                        } lg:text-left ${!isSidebarExpanded ? "md:hidden lg:block" : ""}`}
                      >
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap">주간 레포트</h3>
                        <p
                          className={`text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${
                            isSidebarExpanded ? "md:block" : "md:hidden"
                          } lg:block hidden`}
                        >
                          주간 인사이트 & KPT 회고
                        </p>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </aside>

            <div className="flex-1 min-w-0 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    onClick={handleAnalyze}
                    disabled={analysisLoading || !report}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-60"
                  >
                    {analysisLoading ? "주간 분석 중..." : "주간 분석"}
                  </button>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    자동 저장이 지원되지 않으니 작성 후 저장 버튼을 눌러주세요.
                  </div>
                </div>

                {metrics.length > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                          카테고리별 활동 비중
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          주간 SoD 시간 합계를 기준으로 합니다.
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div
                          className="w-32 h-32 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-inner"
                          style={{ background: pieBackground }}
                        />
                            <div className="flex-1 space-y-2 text-xs">
                              <div className="grid grid-cols-3 gap-2 text-zinc-500 dark:text-zinc-400">
                                <span className="text-zinc-700 dark:text-zinc-200">카테고리</span>
                                <span className="text-center">시간</span>
                                <span className="text-center">비중</span>
                              </div>
                              {pieSegments.map((segment) => (
                                <div key={segment.categoryId ?? "none"} className="grid grid-cols-3 gap-2 text-zinc-600 dark:text-zinc-300">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-block w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: segment.color }}
                                    />
                                    <span>{segment.label}</span>
                                  </div>
                                  <span className="text-center text-zinc-500 dark:text-zinc-400">
                                    {formatHours(segment.minutes)}h
                                  </span>
                                  <span className="text-right text-zinc-500 dark:text-zinc-400">
                                    {segment.value.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                          카테고리별 달성률
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          해당 카테고리 SoD 중 체크된 비율입니다.
                        </p>
                      </div>
                      <div className="flex items-end gap-4 h-48">
                        {metrics.map((metric) => (
                          <div key={metric.id} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full h-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                              <div
                                className="absolute bottom-0 left-0 right-0 rounded-lg"
                                style={{
                                  backgroundColor: getColorForCategory(metric.category_id),
                                  height: `${Math.min(100, Math.max(0, metric.rate))}%`,
                                }}
                              />
                            </div>
                            <div className="text-center text-sm text-zinc-600 dark:text-zinc-300">
                              {getCategoryLabel(metric.category_id)}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {metric.rate.toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-300">
                    주간 분석 결과가 없습니다. 상단의 주간 분석 버튼을 눌러 데이터를 생성해주세요.
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Keep</span>
                    <textarea
                      value={formState.kpt_keep}
                      onChange={(e) => handleInputChange("kpt_keep", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 min-h-[120px] text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="이번 주에 유지하고 싶은 성과를 기록해주세요."
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Problem</span>
                    <textarea
                      value={formState.kpt_problem}
                      onChange={(e) => handleInputChange("kpt_problem", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 min-h-[120px] text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="이번 주에 발생한 문제나 아쉬운 점을 기록해주세요."
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Try</span>
                    <textarea
                      value={formState.kpt_try}
                      onChange={(e) => handleInputChange("kpt_try", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 min-h-[120px] text-sm text-zinc-900 dark:text-zinc-100"
                      placeholder="다음 주에 시도하고 싶은 아이디어를 기록해주세요."
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white text-sm font-semibold transition-colors"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

