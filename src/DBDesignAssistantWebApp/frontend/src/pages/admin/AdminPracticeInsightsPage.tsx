import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, RefreshCw, Search, XCircle } from "lucide-react";
import AdminLayout from "../../components/layouts/AdminLayout";
import { useAuth } from "../../hooks/useAuth";
import practiceInsightsApi from "../../services/practiceInsightsApi";
import type {
    AdminPracticeInsightsFilters,
    AdminPracticeProviderBreakdownItem,
    AdminPracticeInsightsResponse,
    AdminPracticeStatusBreakdownItem,
    ExerciseSource,
    PracticeIssueTypeItem,
    SubmissionStatus,
} from "../../types";
import "../practiceInsights.css";

type FallbackFilter = "" | "true" | "false";

type FilterForm = {
    from: string;
    to: string;
    status: SubmissionStatus | "";
    roundStatus: SubmissionStatus | "";
    exerciseSource: ExerciseSource | "";
    provider: string;
    fallbackUsed: FallbackFilter;
    exerciseId: string;
    studentId: string;
};

const DEFAULT_FILTER_FORM: FilterForm = {
    from: "",
    to: "",
    status: "",
    roundStatus: "",
    exerciseSource: "",
    provider: "",
    fallbackUsed: "",
    exerciseId: "",
    studentId: "",
};

const SUBMISSION_STATUS_OPTIONS: SubmissionStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "PROCESSING",
    "GRADED",
    "FAILED",
];
const ROUND_STATUS_OPTIONS: SubmissionStatus[] = ["PROCESSING", "GRADED", "FAILED"];
const EXERCISE_SOURCE_OPTIONS: ExerciseSource[] = ["MANUAL", "AI_GENERATED"];

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

const STATUS_COLOR: Record<SubmissionStatus, string> = {
    DRAFT: "#64748b",
    SUBMITTED: "#2563eb",
    PROCESSING: "#d97706",
    GRADED: "#059669",
    FAILED: "#dc2626",
};

type ChartRow = {
    id: string;
    label: string;
    value: number;
    valueText: string;
    description?: string;
    fillClassName?: string;
    color?: string;
    secondaryValue?: number;
    secondaryText?: string;
};

type SimpleBarChartProps = {
    rows: ChartRow[];
    emptyText: string;
    ariaLabel: string;
};

type StatusDonutChartProps = {
    rows: ChartRow[];
    emptyText: string;
    ariaLabel: string;
    formatTotalText: (value: number) => string;
    formatPercent: (value: number) => string;
};

type ProviderGroupedBarChartProps = {
    rows: ChartRow[];
    emptyText: string;
    ariaLabel: string;
    primaryLabel: string;
    secondaryLabel: string;
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

const StatusDonutChart = ({
    rows,
    emptyText,
    ariaLabel,
    formatTotalText,
    formatPercent,
}: StatusDonutChartProps) => {
    const visibleRows = rows.filter((row) => row.value > 0);
    const total = visibleRows.reduce((sum, row) => sum + row.value, 0);

    if (total <= 0) {
        return <div className="insights-empty insights-empty--compact">{emptyText}</div>;
    }

    let cursor = 0;
    const gradientStops = visibleRows
        .map((row, index) => {
            const start = cursor;
            const end =
                index === visibleRows.length - 1
                    ? 100
                    : cursor + (row.value / total) * 100;
            cursor = end;
            return `${row.color ?? "#64748b"} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
        })
        .join(", ");

    return (
        <div className="insights-donut-chart" role="img" aria-label={ariaLabel}>
            <div
                className="insights-donut-ring"
                style={{ background: `conic-gradient(${gradientStops})` }}
            >
                <div className="insights-donut-center">
                    <strong>{formatTotalText(total)}</strong>
                </div>
            </div>
            <div className="insights-donut-legend">
                {visibleRows.map((row) => (
                    <div className="insights-donut-legend-row" key={row.id}>
                        <span
                            className="insights-color-dot"
                            style={{ backgroundColor: row.color ?? "#64748b" }}
                        />
                        <strong>{row.label}</strong>
                        <span>{row.valueText}</span>
                        <span>{formatPercent(row.value / total)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProviderGroupedBarChart = ({
    rows,
    emptyText,
    ariaLabel,
    primaryLabel,
    secondaryLabel,
}: ProviderGroupedBarChartProps) => {
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
        <div className="insights-provider-chart" role="img" aria-label={ariaLabel}>
            {rows.map((row) => (
                <div className="insights-provider-row" key={row.id}>
                    <div className="insights-provider-row__header">
                        <div>
                            <strong>{row.label}</strong>
                            {row.description && <span>{row.description}</span>}
                        </div>
                        <div className="insights-chart-row__value">
                            <strong>{row.valueText}</strong>
                            {row.secondaryText && <span>{row.secondaryText}</span>}
                        </div>
                    </div>
                    <div className="insights-provider-bars">
                        <div className="insights-provider-bar-line">
                            <span>{primaryLabel}</span>
                            <div className="insights-provider-track">
                                <div
                                    className="insights-provider-fill insights-provider-fill--primary"
                                    style={{ width: `${widthPercent(row.value)}%` }}
                                />
                            </div>
                            <strong>{row.valueText}</strong>
                        </div>
                        <div className="insights-provider-bar-line">
                            <span>{secondaryLabel}</span>
                            <div className="insights-provider-track">
                                <div
                                    className="insights-provider-fill insights-provider-fill--secondary"
                                    style={{
                                        width: `${widthPercent(row.secondaryValue ?? 0)}%`,
                                    }}
                                />
                            </div>
                            <strong>{row.secondaryText ?? "-"}</strong>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const parsePositiveInt = (value: string) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const buildFilters = (form: FilterForm): AdminPracticeInsightsFilters => ({
    ...(form.from ? { from: form.from } : {}),
    ...(form.to ? { to: form.to } : {}),
    ...(form.status ? { status: form.status } : {}),
    ...(form.roundStatus ? { roundStatus: form.roundStatus } : {}),
    ...(form.exerciseSource ? { exerciseSource: form.exerciseSource } : {}),
    ...(form.provider.trim() ? { provider: form.provider.trim() } : {}),
    ...(form.fallbackUsed ? { fallbackUsed: form.fallbackUsed === "true" } : {}),
    ...(parsePositiveInt(form.exerciseId) ? { exerciseId: parsePositiveInt(form.exerciseId) } : {}),
    ...(parsePositiveInt(form.studentId) ? { studentId: parsePositiveInt(form.studentId) } : {}),
});

export default function AdminPracticeInsightsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [form, setForm] = useState<FilterForm>(DEFAULT_FILTER_FORM);
    const [filters, setFilters] = useState<AdminPracticeInsightsFilters>({});
    const [insights, setInsights] = useState<AdminPracticeInsightsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await practiceInsightsApi.getAdminPracticeInsights(filters);
            setInsights(data);
        } catch {
            setError(t("admin.practiceInsights.loadError"));
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();
    }, [load]);

    const handleApplyFilters = () => {
        setFilters(buildFilters(form));
    };

    const handleResetFilters = () => {
        setForm(DEFAULT_FILTER_FORM);
        setFilters({});
    };

    const summary = insights?.summary;
    const hasAnyData = Boolean(
        summary &&
            (summary.totalSubmissions > 0 ||
                summary.totalRounds > 0 ||
                summary.totalExercises > 0)
    );

    const metricCards = summary
        ? [
              {
                  label: t("admin.practiceInsights.kpis.totalSubmissions"),
                  value: formatNumber(summary.totalSubmissions),
                  hint: t("admin.practiceInsights.kpis.totalStudents", {
                      count: formatNumber(summary.totalStudents),
                  }),
              },
              {
                  label: t("admin.practiceInsights.kpis.totalRounds"),
                  value: formatNumber(summary.totalRounds),
                  hint: t("admin.practiceInsights.kpis.totalExercises", {
                      count: formatNumber(summary.totalExercises),
                  }),
              },
              {
                  label: t("admin.practiceInsights.kpis.averageScore"),
                  value: formatScore(summary.averageScore),
                  hint: t("admin.practiceInsights.kpis.gradedRounds", {
                      count: formatNumber(summary.gradedRounds),
                  }),
              },
              {
                  label: t("admin.practiceInsights.kpis.completionRate"),
                  value: formatRate(summary.completionRate),
                  hint: t("admin.practiceInsights.kpis.failedRounds", {
                      count: formatNumber(summary.failedRounds),
                  }),
              },
              {
                  label: t("admin.practiceInsights.kpis.fallbackRate"),
                  value: formatRate(summary.fallbackRate),
                  hint: t("admin.practiceInsights.kpis.processingRounds", {
                      count: formatNumber(summary.processingRounds),
                  }),
              },
              {
                  label: t("admin.practiceInsights.kpis.failureRate"),
                  value: formatRate(summary.failureRate),
                  hint: t("admin.practiceInsights.kpis.readOnly"),
              },
          ]
        : [];

    const statusChartRows: ChartRow[] = insights
        ? insights.statusBreakdown.map((item: AdminPracticeStatusBreakdownItem) => ({
              id: item.status,
              label: t(`admin.submissions.status.${item.status.toLowerCase()}`),
              value: item.count,
              valueText: t("admin.practiceInsights.chart.count", {
                  count: formatNumber(item.count),
              }),
              color: STATUS_COLOR[item.status],
              fillClassName: `insights-chart-bar--status-${item.status.toLowerCase()}`,
          }))
        : [];

    const providerChartRows: ChartRow[] = insights
        ? insights.providerBreakdown.map((item: AdminPracticeProviderBreakdownItem, index) => ({
              id: `${item.provider ?? "unknown"}-${item.model ?? "model"}-${index}`,
              label: item.provider ?? t("admin.practiceInsights.unknown"),
              description: item.model ?? "-",
              value: item.roundCount,
              valueText: t("admin.practiceInsights.chart.rounds", {
                  count: formatNumber(item.roundCount),
              }),
              secondaryValue: item.fallbackCount,
              secondaryText: t("admin.practiceInsights.chart.fallbackRounds", {
                  count: formatNumber(item.fallbackCount),
              }),
              fillClassName: "insights-chart-bar--provider",
          }))
        : [];

    const issueChartRows: ChartRow[] = insights
        ? insights.topIssueTypes.map((item: PracticeIssueTypeItem, index) => ({
              id: `${item.errorType ?? "unknown"}-${index}`,
              label: item.errorType ?? t("admin.practiceInsights.unknown"),
              value: item.count,
              valueText: t("admin.practiceInsights.chart.occurrences", {
                  count: formatNumber(item.count),
              }),
              description: t("admin.practiceInsights.affectedSubmissions", {
                  count: formatNumber(item.affectedSubmissionCount),
              }),
              fillClassName: "insights-chart-bar--issue",
          }))
        : [];

    return (
        <AdminLayout
            title={t("admin.practiceInsights.title")}
            subtitle={t("admin.practiceInsights.subtitle")}
            onSignOut={handleSignOut}
        >
            <div className="insights-page">
                <section className="section-card">
                    <div className="insights-toolbar">
                        <div>
                            <h2>{t("admin.practiceInsights.title")}</h2>
                            <p>{t("admin.practiceInsights.subtitle")}</p>
                        </div>
                        <div className="insights-actions">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleApplyFilters}
                                disabled={loading}
                            >
                                <Search size={16} />
                                {t("admin.practiceInsights.filters.apply")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={handleResetFilters}
                                disabled={loading}
                            >
                                <XCircle size={16} />
                                {t("admin.practiceInsights.filters.reset")}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={load}
                                disabled={loading}
                                title={t("admin.practiceInsights.refresh")}
                            >
                                <RefreshCw size={16} />
                                {t("admin.practiceInsights.refresh")}
                            </button>
                        </div>
                    </div>

                    <div className="insights-filter-grid">
                        <input
                            className="input"
                            type="date"
                            value={form.from}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, from: event.target.value }))
                            }
                            aria-label={t("admin.practiceInsights.filters.from")}
                        />
                        <input
                            className="input"
                            type="date"
                            value={form.to}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, to: event.target.value }))
                            }
                            aria-label={t("admin.practiceInsights.filters.to")}
                        />
                        <select
                            className="input"
                            value={form.status}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    status: event.target.value as SubmissionStatus | "",
                                }))
                            }
                        >
                            <option value="">
                                {t("admin.practiceInsights.filters.allSubmissionStatuses")}
                            </option>
                            {SUBMISSION_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {t(`admin.submissions.status.${status.toLowerCase()}`)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input"
                            value={form.roundStatus}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    roundStatus: event.target.value as SubmissionStatus | "",
                                }))
                            }
                        >
                            <option value="">
                                {t("admin.practiceInsights.filters.allRoundStatuses")}
                            </option>
                            {ROUND_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {t(`admin.submissions.status.${status.toLowerCase()}`)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input"
                            value={form.exerciseSource}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    exerciseSource: event.target.value as ExerciseSource | "",
                                }))
                            }
                        >
                            <option value="">
                                {t("admin.practiceInsights.filters.allSources")}
                            </option>
                            {EXERCISE_SOURCE_OPTIONS.map((source) => (
                                <option key={source} value={source}>
                                    {t(`admin.practiceInsights.sources.${source.toLowerCase()}`)}
                                </option>
                            ))}
                        </select>
                        <input
                            className="input"
                            value={form.provider}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, provider: event.target.value }))
                            }
                            placeholder={t("admin.practiceInsights.filters.provider")}
                        />
                        <select
                            className="input"
                            value={form.fallbackUsed}
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    fallbackUsed: event.target.value as FallbackFilter,
                                }))
                            }
                        >
                            <option value="">{t("admin.practiceInsights.filters.allFallback")}</option>
                            <option value="true">
                                {t("admin.practiceInsights.filters.fallbackOnly")}
                            </option>
                            <option value="false">
                                {t("admin.practiceInsights.filters.noFallback")}
                            </option>
                        </select>
                        <input
                            className="input insights-id-field"
                            type="number"
                            min="1"
                            value={form.exerciseId}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, exerciseId: event.target.value }))
                            }
                            placeholder={t("admin.practiceInsights.filters.exerciseId")}
                        />
                        <input
                            className="input insights-id-field"
                            type="number"
                            min="1"
                            value={form.studentId}
                            onChange={(event) =>
                                setForm((prev) => ({ ...prev, studentId: event.target.value }))
                            }
                            placeholder={t("admin.practiceInsights.filters.studentId")}
                        />
                    </div>
                </section>

                {loading ? (
                    <section className="section-card">
                        <p className="loading-text">{t("admin.practiceInsights.loading")}</p>
                    </section>
                ) : error ? (
                    <section className="section-card">
                        <div className="alert">
                            {error}
                            <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={load}>
                                {t("admin.submissions.retry")}
                            </button>
                        </div>
                    </section>
                ) : insights ? (
                    <>
                        {!hasAnyData && (
                            <div className="insights-empty">
                                {t("admin.practiceInsights.empty")}
                            </div>
                        )}

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
                            <article className="insights-panel insights-panel--status">
                                <h3>{t("admin.practiceInsights.sections.statusBreakdown")}</h3>
                                <p>{t("admin.practiceInsights.chartDescriptions.status")}</p>
                                <StatusDonutChart
                                    rows={statusChartRows}
                                    emptyText={t("admin.practiceInsights.emptyCharts.status")}
                                    ariaLabel={t("admin.practiceInsights.sections.statusBreakdown")}
                                    formatTotalText={(value) =>
                                        t("admin.practiceInsights.chart.count", {
                                            count: formatNumber(value),
                                        })
                                    }
                                    formatPercent={formatRate}
                                />
                            </article>

                            <article className="insights-panel insights-panel--provider">
                                <h3>{t("admin.practiceInsights.sections.providerBreakdown")}</h3>
                                <p>{t("admin.practiceInsights.chartDescriptions.provider")}</p>
                                <div className="insights-chart-legend">
                                    <span>{t("admin.practiceInsights.chart.roundLegend")}</span>
                                    <span>{t("admin.practiceInsights.chart.fallbackLegend")}</span>
                                </div>
                                <ProviderGroupedBarChart
                                    rows={providerChartRows}
                                    emptyText={t("admin.practiceInsights.emptyCharts.provider")}
                                    ariaLabel={t("admin.practiceInsights.sections.providerBreakdown")}
                                    primaryLabel={t("admin.practiceInsights.chart.roundLegend")}
                                    secondaryLabel={t("admin.practiceInsights.chart.fallbackLegend")}
                                />
                            </article>

                            <article className="insights-panel insights-panel--issues">
                                <h3>{t("admin.practiceInsights.sections.topIssueTypes")}</h3>
                                <p>{t("admin.practiceInsights.chartDescriptions.issues")}</p>
                                <SimpleBarChart
                                    rows={issueChartRows}
                                    emptyText={t("admin.practiceInsights.emptyCharts.issues")}
                                    ariaLabel={t("admin.practiceInsights.sections.topIssueTypes")}
                                />
                            </article>
                        </section>

                        <section className="section-card">
                            <div className="insights-toolbar">
                                <div>
                                    <h2>{t("admin.practiceInsights.sections.recentRounds")}</h2>
                                    <p>{t("admin.practiceInsights.recentRoundsHint")}</p>
                                </div>
                                <span className="tag">
                                    {t("admin.practiceInsights.totalRecentRounds", {
                                        count: insights.recentRounds.length,
                                    })}
                                </span>
                            </div>
                            {insights.recentRounds.length === 0 ? (
                                <div className="insights-empty">
                                    {t("admin.practiceInsights.emptyPanel")}
                                </div>
                            ) : (
                                <div className="insights-table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>{t("admin.evaluationRounds.columns.round")}</th>
                                                <th>{t("admin.evaluationRounds.columns.submission")}</th>
                                                <th>{t("admin.evaluationRounds.columns.student")}</th>
                                                <th>{t("admin.evaluationRounds.columns.status")}</th>
                                                <th>{t("admin.evaluationRounds.columns.score")}</th>
                                                <th>{t("admin.evaluationRounds.columns.provider")}</th>
                                                <th>{t("admin.evaluationRounds.columns.time")}</th>
                                                <th>{t("admin.evaluationRounds.columns.actions")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {insights.recentRounds.map((round) => (
                                                <tr key={round.roundId}>
                                                    <td>
                                                        <code>#{round.roundId}</code>
                                                        <div className="insights-muted">
                                                            {t("admin.evaluationRounds.roundNumber", {
                                                                number: round.roundNumber,
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <code>#{round.submissionId}</code>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {round.studentName ?? "-"}
                                                        </div>
                                                        <div className="insights-muted">
                                                            {round.studentEmail ?? "-"}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={STATUS_CLASS[round.roundStatus]}>
                                                            {t(
                                                                `admin.submissions.status.${round.roundStatus.toLowerCase()}`
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td>{formatScore(round.overallScore)}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {round.provider ?? "-"}
                                                        </div>
                                                        <div className="insights-muted">{round.model ?? "-"}</div>
                                                    </td>
                                                    <td className="insights-muted">
                                                        <div>{formatDate(round.submittedAt)}</div>
                                                        <div>{formatDate(round.gradedAt)}</div>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-icon"
                                                            title={t("admin.evaluationRounds.viewSubmission")}
                                                            aria-label={t("admin.evaluationRounds.viewSubmission")}
                                                            onClick={() =>
                                                                navigate(`/admin/submissions/${round.submissionId}`)
                                                            }
                                                        >
                                                            <Eye size={18} />
                                                        </button>
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
        </AdminLayout>
    );
}
