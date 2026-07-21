import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, RefreshCw } from "lucide-react";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import { useAuth } from "../../hooks/useAuth";
import { instructorExerciseApi } from "../../services/instructorExerciseApi";
import practiceInsightsApi from "../../services/practiceInsightsApi";
import type {
    AnonymizedSubmissionSummary,
    Exercise,
    InstructorExerciseInsightsResponse,
    PracticeInsightsScope,
    PracticeIssueTypeItem,
    PracticeRoundDistributionItem,
    PracticeScoreDistributionItem,
    PracticeSkillAnalyticsItem,
    PracticeTrendItem,
    SubmissionStatus,
} from "../../types";
import "../practiceInsights.css";

type ChartRow = {
    id: string;
    label: string;
    value: number;
    valueText: string;
    description?: string;
    fillClassName?: string;
    secondaryValue?: number;
    secondaryText?: string;
};

type SimpleBarChartProps = {
    rows: ChartRow[];
    emptyText: string;
    ariaLabel: string;
};

const SCOPE_OPTIONS: PracticeInsightsScope[] = ["ALL", "DIRECT", "DERIVED_AI"];

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

const SimpleBarChart = ({ rows, emptyText, ariaLabel }: SimpleBarChartProps) => {
    const hasValues = rows.some((row) => row.value > 0 || (row.secondaryValue ?? 0) > 0);
    if (!hasValues) {
        return <div className="insights-empty insights-empty--compact">{emptyText}</div>;
    }

    const maxValue = Math.max(
        1,
        ...rows.flatMap((row) => [row.value, row.secondaryValue ?? 0])
    );
    const widthPercent = (value: number) =>
        value <= 0 ? 0 : Math.max((value / maxValue) * 100, 2);

    return (
        <div className="insights-chart" role="img" aria-label={ariaLabel}>
            {rows.map((row) => (
                <div className="insights-chart-row" key={row.id}>
                    <div className="insights-chart-row__header">
                        <div>
                            <strong>{row.label}</strong>
                            {row.description && <span>{row.description}</span>}
                        </div>
                        <div className="insights-chart-row__value">
                            <strong>{row.valueText}</strong>
                            {row.secondaryText && <span>{row.secondaryText}</span>}
                        </div>
                    </div>
                    <div className="insights-chart-track">
                        <div
                            className={`insights-chart-bar ${row.fillClassName ?? ""}`}
                            style={{ width: `${widthPercent(row.value)}%` }}
                        />
                        {row.secondaryValue !== undefined && row.secondaryValue > 0 && (
                            <div
                                className="insights-chart-bar insights-chart-bar--secondary"
                                style={{ width: `${widthPercent(row.secondaryValue)}%` }}
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const toPositiveInt = (value: string) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const formatExerciseOption = (exercise: Exercise) => {
    const code = exercise.exerciseCode ? `${exercise.exerciseCode} - ` : "";
    return `${code}${exercise.exTitle}`;
};

export default function InstructorPracticeInsightsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedExerciseId, setSelectedExerciseId] = useState("");
    const [scope, setScope] = useState<PracticeInsightsScope>("ALL");
    const [insights, setInsights] = useState<InstructorExerciseInsightsResponse | null>(null);
    const [exerciseLoading, setExerciseLoading] = useState(true);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [exerciseError, setExerciseError] = useState<string | null>(null);
    const [insightsError, setInsightsError] = useState<string | null>(null);

    const selectedExerciseIdNumber = useMemo(
        () => toPositiveInt(selectedExerciseId),
        [selectedExerciseId]
    );
    const selectedExercise = useMemo(
        () => exercises.find((exercise) => exercise.exerciseId === selectedExerciseIdNumber),
        [exercises, selectedExerciseIdNumber]
    );

    const numberFormat = useMemo(() => new Intl.NumberFormat(), []);
    const scoreFormat = useMemo(
        () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }),
        []
    );
    const percentFormat = useMemo(
        () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }),
        []
    );

    const formatNumber = (value: number | null | undefined) =>
        value === null || value === undefined ? "-" : numberFormat.format(value);

    const formatScore = (value: number | null | undefined) =>
        value === null || value === undefined ? "-" : scoreFormat.format(value);

    const formatRate = (value: number | null | undefined) =>
        value === null || value === undefined ? "-" : `${percentFormat.format(value * 100)}%`;

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateOnly = (dateStr: string | null | undefined) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatCommonErrorTypes = (errorTypes: string[] | null | undefined) => {
        const values = (errorTypes ?? []).filter(Boolean).slice(0, 3);
        if (values.length === 0) {
            return t("instructor.practiceInsights.skillAnalytics.noCommonErrors", {
                defaultValue: "No mapped issue types",
            });
        }
        return values.join(", ");
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const loadExercises = useCallback(async () => {
        setExerciseLoading(true);
        setExerciseError(null);
        try {
            const data = await instructorExerciseApi.getAll({});
            setExercises(data);
        } catch {
            setExerciseError(t("instructor.practiceInsights.loadExercisesError"));
        } finally {
            setExerciseLoading(false);
        }
    }, [t]);

    const loadInsights = useCallback(async () => {
        if (!selectedExerciseIdNumber) {
            return;
        }

        setInsightsLoading(true);
        setInsightsError(null);
        try {
            const data = await practiceInsightsApi.getInstructorExerciseInsights(
                selectedExerciseIdNumber,
                { scope }
            );
            setInsights(data);
        } catch {
            setInsightsError(t("instructor.exerciseInsights.loadError"));
        } finally {
            setInsightsLoading(false);
        }
    }, [scope, selectedExerciseIdNumber, t]);

    useEffect(() => {
        const init = async () => {
            await loadExercises();
        };
        init();
    }, [loadExercises]);

    useEffect(() => {
        if (!selectedExerciseIdNumber) {
            return;
        }

        const init = async () => {
            await loadInsights();
        };
        init();
    }, [loadInsights, selectedExerciseIdNumber]);

    const handleSelectExercise = (value: string) => {
        setSelectedExerciseId(value);
        setInsights(null);
        setInsightsError(null);
    };

    const handleRefresh = () => {
        if (selectedExerciseIdNumber) {
            loadInsights();
            return;
        }
        loadExercises();
    };

    const handleOpenExerciseDetail = () => {
        if (selectedExerciseIdNumber) {
            navigate(`/instructor/exercises/${selectedExerciseIdNumber}`);
        }
    };

    const summary = insights?.summary;
    const hasAnyData = Boolean(
        insights && (insights.scope.includedSubmissionCount > 0 || insights.summary.totalRounds > 0)
    );

    const metricCards = summary
        ? [
              {
                  label: t("instructor.exerciseInsights.kpis.directSubmissions"),
                  value: formatNumber(summary.directSubmissionCount),
                  hint: t("instructor.exerciseInsights.kpis.derivedSubmissions", {
                      count: formatNumber(summary.derivedSubmissionCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.participants"),
                  value: formatNumber(summary.participantCount),
                  hint: t("instructor.exerciseInsights.kpis.includedSubmissions", {
                      count: formatNumber(insights?.scope.includedSubmissionCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.graded"),
                  value: formatNumber(summary.gradedCount),
                  hint: t("instructor.exerciseInsights.kpis.failedProcessing", {
                      failed: formatNumber(summary.failedCount),
                      processing: formatNumber(summary.processingCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.averageScore"),
                  value: formatScore(summary.averageScore),
                  hint: t("instructor.exerciseInsights.kpis.totalRounds", {
                      count: formatNumber(summary.totalRounds),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.fallbackRate"),
                  value: formatRate(summary.fallbackRate),
                  hint: t("instructor.exerciseInsights.kpis.derivedExercises", {
                      count: formatNumber(summary.derivedAiExerciseCount),
                  }),
              },
          ]
        : [];

    const scopeChartRows: ChartRow[] = summary
        ? [
              {
                  id: "direct",
                  label: t("instructor.exerciseInsights.scopes.direct"),
                  value: summary.directSubmissionCount,
                  valueText: t("instructor.practiceInsights.chart.submissions", {
                      count: formatNumber(summary.directSubmissionCount),
                  }),
                  fillClassName: "insights-chart-bar--provider",
              },
              {
                  id: "derived-ai",
                  label: t("instructor.exerciseInsights.scopes.derived_ai"),
                  value: summary.derivedSubmissionCount,
                  valueText: t("instructor.practiceInsights.chart.submissions", {
                      count: formatNumber(summary.derivedSubmissionCount),
                  }),
                  fillClassName: "insights-chart-bar--secondary",
              },
          ]
        : [];

    const statusChartRows: ChartRow[] = summary
        ? [
              {
                  id: "graded",
                  label: t("admin.submissions.status.graded"),
                  value: summary.gradedCount,
                  valueText: t("instructor.practiceInsights.chart.submissions", {
                      count: formatNumber(summary.gradedCount),
                  }),
                  fillClassName: "insights-chart-bar--status-graded",
              },
              {
                  id: "failed",
                  label: t("admin.submissions.status.failed"),
                  value: summary.failedCount,
                  valueText: t("instructor.practiceInsights.chart.submissions", {
                      count: formatNumber(summary.failedCount),
                  }),
                  fillClassName: "insights-chart-bar--status-failed",
              },
              {
                  id: "processing",
                  label: t("admin.submissions.status.processing"),
                  value: summary.processingCount,
                  valueText: t("instructor.practiceInsights.chart.submissions", {
                      count: formatNumber(summary.processingCount),
                  }),
                  fillClassName: "insights-chart-bar--status-processing",
              },
          ]
        : [];

    const scoreChartRows: ChartRow[] = insights
        ? (insights.scoreDistribution ?? []).map(
              (item: PracticeScoreDistributionItem, index) => ({
                  id: `${item.bucket ?? "score"}-${index}`,
                  label: item.bucket ?? t("instructor.exerciseInsights.unknown"),
                  value: item.roundCount ?? 0,
                  valueText: t("instructor.practiceInsights.chart.rounds", {
                      count: formatNumber(item.roundCount ?? 0),
                  }),
                  description: t("instructor.practiceInsights.scoreBucketHint", {
                      submissions: formatNumber(item.affectedSubmissionCount ?? 0),
                      average: formatScore(item.averageScore),
                  }),
                  fillClassName: "insights-chart-bar--score",
              })
          )
        : [];

    const roundChartRows: ChartRow[] = insights
        ? (insights.roundDistribution ?? []).map(
              (item: PracticeRoundDistributionItem, index) => ({
                  id: `${item.roundNumber ?? "round"}-${index}`,
                  label: item.roundNumber
                      ? t("instructor.practiceInsights.chart.roundNumber", {
                            number: item.roundNumber,
                        })
                      : t("instructor.exerciseInsights.unknown"),
                  value: item.roundCount ?? 0,
                  valueText: t("instructor.practiceInsights.chart.rounds", {
                      count: formatNumber(item.roundCount ?? 0),
                  }),
                  secondaryValue: item.gradedCount ?? 0,
                  secondaryText: t("instructor.practiceInsights.chart.gradedRounds", {
                      count: formatNumber(item.gradedCount ?? 0),
                  }),
                  description: t("instructor.practiceInsights.roundBucketHint", {
                      failed: formatNumber(item.failedCount ?? 0),
                      processing: formatNumber(item.processingCount ?? 0),
                      average: formatScore(item.averageScore),
                  }),
                  fillClassName: "insights-chart-bar--round",
              })
          )
        : [];

    const trendChartRows: ChartRow[] = insights
        ? (insights.trend ?? []).map((item: PracticeTrendItem, index) => ({
              id: `${item.date ?? "trend"}-${index}`,
              label: formatDateOnly(item.date),
              value: item.submissionCount ?? 0,
              valueText: t("instructor.practiceInsights.chart.submissions", {
                  count: formatNumber(item.submissionCount ?? 0),
              }),
              secondaryValue: item.gradedRoundCount ?? 0,
              secondaryText: t("instructor.practiceInsights.chart.gradedRounds", {
                  count: formatNumber(item.gradedRoundCount ?? 0),
              }),
              description: t("instructor.practiceInsights.trendScoreHint", {
                  score: formatScore(item.averageScore),
              }),
              fillClassName: "insights-chart-bar--trend",
          }))
        : [];

    const skillChartRows: ChartRow[] = insights
        ? (insights.skillAnalytics ?? []).map(
              (item: PracticeSkillAnalyticsItem, index) => ({
                  id: `${item.skillCode}-${index}`,
                  label: t(`instructor.practiceInsights.skills.${item.skillCode}`, {
                      defaultValue: item.skillName ?? item.skillCode,
                  }),
                  value: item.issueCount ?? 0,
                  valueText: t("instructor.practiceInsights.chart.occurrences", {
                      count: formatNumber(item.issueCount ?? 0),
                  }),
                  secondaryValue: item.affectedRoundCount ?? 0,
                  secondaryText: t("instructor.practiceInsights.skillAnalytics.impact", {
                      rate: formatRate(item.impactRate),
                      defaultValue: "{{rate}} affected rounds",
                  }),
                  description: t("instructor.practiceInsights.skillAnalytics.coverage", {
                      submissions: formatNumber(item.affectedSubmissionCount ?? 0),
                      rounds: formatNumber(item.affectedRoundCount ?? 0),
                      errors: formatCommonErrorTypes(item.commonErrorTypes),
                      defaultValue: "{{submissions}} submissions, {{rounds}} rounds - {{errors}}",
                  }),
                  fillClassName: "insights-chart-bar--skill",
              })
          )
        : [];

    const issueChartRows: ChartRow[] = insights
        ? insights.topIssueTypes.map((item: PracticeIssueTypeItem, index) => {
              const description =
                  item.affectedRoundCount === undefined
                      ? t("instructor.exerciseInsights.affectedSubmissions", {
                            count: formatNumber(item.affectedSubmissionCount),
                        })
                      : t("instructor.exerciseInsights.affectedCoverage", {
                            submissions: formatNumber(item.affectedSubmissionCount),
                            rounds: formatNumber(item.affectedRoundCount),
                        });
              return {
                  id: `${item.errorType ?? "unknown"}-${index}`,
                  label: item.errorType ?? t("instructor.exerciseInsights.unknown"),
                  value: item.count,
                  valueText: t("instructor.practiceInsights.chart.occurrences", {
                      count: formatNumber(item.count),
                  }),
                  description,
                  fillClassName: "insights-chart-bar--issue",
              };
          })
        : [];

    const anonymizedRows: AnonymizedSubmissionSummary[] =
        insights?.anonymizedSubmissionSummaries ?? [];

    return (
        <InstructorLayout
            title={t("instructor.practiceInsights.title")}
            subtitle={t("instructor.practiceInsights.subtitle")}
            onSignOut={handleSignOut}
        >
            <div className="insights-page">
                <section className="section-card">
                    <div className="insights-toolbar">
                        <div>
                            <h2>{t("instructor.practiceInsights.title")}</h2>
                            <p>{t("instructor.practiceInsights.selectorSubtitle")}</p>
                        </div>
                        <div className="insights-actions">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={handleRefresh}
                                disabled={exerciseLoading || insightsLoading}
                            >
                                <RefreshCw size={16} />
                                {t("instructor.exerciseInsights.refresh")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleOpenExerciseDetail}
                                disabled={!selectedExerciseIdNumber}
                            >
                                <ExternalLink size={16} />
                                {t("instructor.practiceInsights.viewExerciseDetail")}
                            </button>
                        </div>
                    </div>

                    <div className="insights-filter-grid">
                        <select
                            className="input"
                            value={selectedExerciseId}
                            onChange={(event) => handleSelectExercise(event.target.value)}
                            disabled={exerciseLoading}
                            aria-label={t("instructor.practiceInsights.exerciseSelect")}
                        >
                            <option value="">
                                {t("instructor.practiceInsights.exercisePlaceholder")}
                            </option>
                            {exercises.map((exercise) => (
                                <option key={exercise.exerciseId} value={exercise.exerciseId}>
                                    {formatExerciseOption(exercise)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input"
                            value={scope}
                            onChange={(event) =>
                                setScope(event.target.value as PracticeInsightsScope)
                            }
                            disabled={!selectedExerciseIdNumber}
                            aria-label={t("instructor.exerciseInsights.exercise.scope")}
                        >
                            {SCOPE_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                    {t(
                                        `instructor.exerciseInsights.scopes.${item.toLowerCase()}`
                                    )}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="insights-muted" style={{ marginTop: 12 }}>
                        {t("instructor.practiceInsights.privacyNote")}
                    </p>
                </section>

                {exerciseError && (
                    <section className="section-card">
                        <div className="alert">
                            {exerciseError}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ marginLeft: 12 }}
                                onClick={loadExercises}
                            >
                                {t("admin.submissions.retry")}
                            </button>
                        </div>
                    </section>
                )}

                {exerciseLoading ? (
                    <section className="section-card">
                        <p className="loading-text">{t("admin.exercises.loading")}</p>
                    </section>
                ) : exercises.length === 0 ? (
                    <div className="insights-empty">
                        {t("instructor.practiceInsights.emptyExercises")}
                    </div>
                ) : !selectedExerciseIdNumber ? (
                    <div className="insights-empty">
                        {t("instructor.practiceInsights.chooseExercise")}
                    </div>
                ) : insightsLoading ? (
                    <section className="section-card">
                        <p className="loading-text">{t("instructor.exerciseInsights.loading")}</p>
                    </section>
                ) : insightsError ? (
                    <section className="section-card">
                        <div className="alert">
                            {insightsError}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ marginLeft: 12 }}
                                onClick={loadInsights}
                            >
                                {t("admin.submissions.retry")}
                            </button>
                        </div>
                    </section>
                ) : insights ? (
                    <>
                        {!hasAnyData && (
                            <div className="insights-empty">
                                {t("instructor.exerciseInsights.empty")}
                            </div>
                        )}

                        <section className="insights-panel">
                            <div className="detail-field-grid">
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("instructor.exerciseInsights.exercise.code")}
                                    </span>
                                    <span className="detail-field__value">
                                        {insights.exercise.exerciseCode ?? "-"}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("instructor.exerciseInsights.exercise.title")}
                                    </span>
                                    <span className="detail-field__value">
                                        {insights.exercise.exerciseTitle ??
                                            selectedExercise?.exTitle ??
                                            "-"}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("instructor.exerciseInsights.exercise.source")}
                                    </span>
                                    <span
                                        className={`tag ${
                                            insights.exercise.exerciseSource === "AI_GENERATED"
                                                ? "tag--ai"
                                                : ""
                                        }`}
                                    >
                                        {t(
                                            `admin.practiceInsights.sources.${insights.exercise.exerciseSource.toLowerCase()}`
                                        )}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("instructor.exerciseInsights.exercise.scope")}
                                    </span>
                                    <span className="detail-field__value">
                                        {t(
                                            `instructor.exerciseInsights.scopes.${insights.scope.selectedScope.toLowerCase()}`
                                        )}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t(
                                            "instructor.exerciseInsights.exercise.derivedAiExerciseCount"
                                        )}
                                    </span>
                                    <span className="detail-field__value">
                                        {formatNumber(insights.scope.derivedAiExerciseCount)}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t(
                                            "instructor.exerciseInsights.exercise.includedSubmissionCount"
                                        )}
                                    </span>
                                    <span className="detail-field__value">
                                        {formatNumber(insights.scope.includedSubmissionCount)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className="insights-metric-grid">
                            {metricCards.map((card) => (
                                <article className="insights-card" key={card.label}>
                                    <span className="insights-card__label">{card.label}</span>
                                    <span className="insights-card__value">{card.value}</span>
                                    <span className="insights-card__hint">{card.hint}</span>
                                </article>
                            ))}
                        </section>

                        <section className="insights-section-grid">
                            <article className="insights-panel">
                                <h3>{t("instructor.practiceInsights.sections.scopeBreakdown")}</h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.scope")}</p>
                                <SimpleBarChart
                                    rows={scopeChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.scope")}
                                    ariaLabel={t(
                                        "instructor.practiceInsights.sections.scopeBreakdown"
                                    )}
                                />
                            </article>

                            <article className="insights-panel">
                                <h3>{t("instructor.practiceInsights.sections.statusBreakdown")}</h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.status")}</p>
                                <SimpleBarChart
                                    rows={statusChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.status")}
                                    ariaLabel={t(
                                        "instructor.practiceInsights.sections.statusBreakdown"
                                    )}
                                />
                            </article>

                            <article className="insights-panel">
                                <h3>{t("instructor.practiceInsights.sections.trend")}</h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.trend")}</p>
                                <div className="insights-chart-legend">
                                    <span>
                                        {t("instructor.practiceInsights.chart.submissionLegend")}
                                    </span>
                                    <span>{t("instructor.practiceInsights.chart.gradedLegend")}</span>
                                </div>
                                <SimpleBarChart
                                    rows={trendChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.trend")}
                                    ariaLabel={t("instructor.practiceInsights.sections.trend")}
                                />
                            </article>
                        </section>

                        <section className="insights-section-grid">
                            <article className="insights-panel">
                                <h3>
                                    {t("instructor.practiceInsights.sections.scoreDistribution")}
                                </h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.score")}</p>
                                <SimpleBarChart
                                    rows={scoreChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.score")}
                                    ariaLabel={t(
                                        "instructor.practiceInsights.sections.scoreDistribution"
                                    )}
                                />
                            </article>

                            <article className="insights-panel">
                                <h3>
                                    {t("instructor.practiceInsights.sections.roundDistribution")}
                                </h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.rounds")}</p>
                                <SimpleBarChart
                                    rows={roundChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.rounds")}
                                    ariaLabel={t(
                                        "instructor.practiceInsights.sections.roundDistribution"
                                    )}
                                />
                            </article>

                            <article className="insights-panel insights-panel--skill">
                                <h3>
                                    {t("instructor.practiceInsights.sections.skillAnalytics", {
                                        defaultValue: "Kỹ năng cần cải thiện",
                                    })}
                                </h3>
                                <p>
                                    {t(
                                        "instructor.practiceInsights.chartDescriptions.skillAnalytics",
                                        {
                                            defaultValue:
                                                "Tổng hợp nhóm kỹ năng từ lỗi trong các vòng đánh giá, không hiển thị thông tin sinh viên.",
                                        }
                                    )}
                                </p>
                                <SimpleBarChart
                                    rows={skillChartRows}
                                    emptyText={t(
                                        "instructor.practiceInsights.emptyCharts.skillAnalytics",
                                        {
                                            defaultValue:
                                                "Chưa có lỗi đánh giá để suy luận nhóm kỹ năng.",
                                        }
                                    )}
                                    ariaLabel={t(
                                        "instructor.practiceInsights.sections.skillAnalytics",
                                        {
                                            defaultValue: "Kỹ năng cần cải thiện",
                                        }
                                    )}
                                />
                            </article>

                            <article className="insights-panel">
                                <h3>{t("instructor.exerciseInsights.sections.topIssueTypes")}</h3>
                                <p>{t("instructor.practiceInsights.chartDescriptions.issues")}</p>
                                <SimpleBarChart
                                    rows={issueChartRows}
                                    emptyText={t("instructor.practiceInsights.emptyCharts.issues")}
                                    ariaLabel={t(
                                        "instructor.exerciseInsights.sections.topIssueTypes"
                                    )}
                                />
                            </article>
                        </section>

                        <section className="section-card">
                            <div className="insights-toolbar">
                                <div>
                                    <h2>
                                        {t(
                                            "instructor.exerciseInsights.sections.anonymizedSubmissions"
                                        )}
                                    </h2>
                                    <p>{t("instructor.exerciseInsights.anonymizedHint")}</p>
                                </div>
                                <span className="tag">
                                    {t("instructor.exerciseInsights.totalSubmissions", {
                                        count: anonymizedRows.length,
                                    })}
                                </span>
                            </div>

                            {anonymizedRows.length === 0 ? (
                                <div className="insights-empty">
                                    {t("instructor.exerciseInsights.emptyPanel")}
                                </div>
                            ) : (
                                <div className="insights-table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    {t(
                                                        "instructor.exerciseInsights.columns.submission"
                                                    )}
                                                </th>
                                                <th>
                                                    {t("instructor.exerciseInsights.columns.scope")}
                                                </th>
                                                <th>
                                                    {t("instructor.exerciseInsights.columns.status")}
                                                </th>
                                                <th>
                                                    {t(
                                                        "instructor.exerciseInsights.columns.roundsUsed"
                                                    )}
                                                </th>
                                                <th>
                                                    {t(
                                                        "instructor.exerciseInsights.columns.latestRound"
                                                    )}
                                                </th>
                                                <th>
                                                    {t(
                                                        "instructor.exerciseInsights.columns.latestScore"
                                                    )}
                                                </th>
                                                <th>
                                                    {t("instructor.exerciseInsights.columns.time")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {anonymizedRows.map((submission) => (
                                                <tr key={submission.submissionId}>
                                                    <td>
                                                        <code>#{submission.submissionId}</code>
                                                    </td>
                                                    <td>
                                                        {t(
                                                            `instructor.exerciseInsights.scopes.${submission.exerciseScope.toLowerCase()}`
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={
                                                                STATUS_CLASS[
                                                                    submission.submissionStatus
                                                                ]
                                                            }
                                                        >
                                                            {t(
                                                                `admin.submissions.status.${submission.submissionStatus.toLowerCase()}`
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td>{submission.roundsUsed ?? "-"}</td>
                                                    <td>
                                                        {submission.latestRoundStatus ? (
                                                            <span
                                                                className={
                                                                    STATUS_CLASS[
                                                                        submission.latestRoundStatus
                                                                    ]
                                                                }
                                                            >
                                                                {t(
                                                                    `admin.submissions.status.${submission.latestRoundStatus.toLowerCase()}`
                                                                )}
                                                            </span>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                    <td>{formatScore(submission.latestScore)}</td>
                                                    <td className="insights-muted">
                                                        <div>{formatDate(submission.submittedAt)}</div>
                                                        <div>{formatDate(submission.gradedAt)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                ) : null}
            </div>
        </InstructorLayout>
    );
}
