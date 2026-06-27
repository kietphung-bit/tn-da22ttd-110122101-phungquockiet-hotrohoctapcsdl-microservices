import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw, Search, XCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import SampleSolutionEditor from "../../components/admin/SampleSolutionEditor";
import ScenarioViewer from "../../components/viewers/ScenarioViewer";
import { instructorExerciseApi } from "../../services/instructorExerciseApi";
import practiceInsightsApi from "../../services/practiceInsightsApi";
import type {
    Exercise,
    InstructorExerciseInsightsFilters,
    InstructorExerciseInsightsResponse,
    PracticeInsightsScope,
    SubmissionStatus,
} from "../../types";
import "../practiceInsights.css";

type Tab = "info" | "solution" | "insights";

type FallbackFilter = "" | "true" | "false";

type InsightsFilterForm = {
    from: string;
    to: string;
    submissionStatus: SubmissionStatus | "";
    roundStatus: SubmissionStatus | "";
    roundNumber: string;
    provider: string;
    fallbackUsed: FallbackFilter;
    scope: PracticeInsightsScope;
};

const DEFAULT_INSIGHTS_FILTER_FORM: InsightsFilterForm = {
    from: "",
    to: "",
    submissionStatus: "",
    roundStatus: "",
    roundNumber: "",
    provider: "",
    fallbackUsed: "",
    scope: "ALL",
};

const SUBMISSION_STATUS_OPTIONS: SubmissionStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "PROCESSING",
    "GRADED",
    "FAILED",
];
const ROUND_STATUS_OPTIONS: SubmissionStatus[] = ["PROCESSING", "GRADED", "FAILED"];
const SCOPE_OPTIONS: PracticeInsightsScope[] = ["ALL", "DIRECT", "DERIVED_AI"];

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

const buildInsightsFilters = (form: InsightsFilterForm): InstructorExerciseInsightsFilters => {
    const roundNumber = Number(form.roundNumber);
    return {
        scope: form.scope,
        ...(form.from ? { from: form.from } : {}),
        ...(form.to ? { to: form.to } : {}),
        ...(form.submissionStatus ? { submissionStatus: form.submissionStatus } : {}),
        ...(form.roundStatus ? { roundStatus: form.roundStatus } : {}),
        ...(Number.isInteger(roundNumber) && roundNumber > 0 ? { roundNumber } : {}),
        ...(form.provider.trim() ? { provider: form.provider.trim() } : {}),
        ...(form.fallbackUsed ? { fallbackUsed: form.fallbackUsed === "true" } : {}),
    };
};

type InstructorExerciseInsightsPanelProps = {
    exerciseId: number;
};

const InstructorExerciseInsightsPanel = ({ exerciseId }: InstructorExerciseInsightsPanelProps) => {
    const { t } = useTranslation();
    const [form, setForm] = useState<InsightsFilterForm>(DEFAULT_INSIGHTS_FILTER_FORM);
    const [filters, setFilters] = useState<InstructorExerciseInsightsFilters>({ scope: "ALL" });
    const [insights, setInsights] = useState<InstructorExerciseInsightsResponse | null>(null);
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

    const loadInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await practiceInsightsApi.getInstructorExerciseInsights(exerciseId, filters);
            setInsights(data);
        } catch {
            setError(t("instructor.exerciseInsights.loadError"));
        } finally {
            setLoading(false);
        }
    }, [exerciseId, filters, t]);

    useEffect(() => {
        const init = async () => {
            await loadInsights();
        };
        init();
    }, [loadInsights]);

    const handleApplyFilters = () => {
        setFilters(buildInsightsFilters(form));
    };

    const handleResetFilters = () => {
        setForm(DEFAULT_INSIGHTS_FILTER_FORM);
        setFilters({ scope: "ALL" });
    };

    const summaryCards = insights
        ? [
              {
                  label: t("instructor.exerciseInsights.kpis.directSubmissions"),
                  value: formatNumber(insights.summary.directSubmissionCount),
                  hint: t("instructor.exerciseInsights.kpis.derivedSubmissions", {
                      count: formatNumber(insights.summary.derivedSubmissionCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.participants"),
                  value: formatNumber(insights.summary.participantCount),
                  hint: t("instructor.exerciseInsights.kpis.includedSubmissions", {
                      count: formatNumber(insights.scope.includedSubmissionCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.graded"),
                  value: formatNumber(insights.summary.gradedCount),
                  hint: t("instructor.exerciseInsights.kpis.failedProcessing", {
                      failed: formatNumber(insights.summary.failedCount),
                      processing: formatNumber(insights.summary.processingCount),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.averageScore"),
                  value: formatScore(insights.summary.averageScore),
                  hint: t("instructor.exerciseInsights.kpis.totalRounds", {
                      count: formatNumber(insights.summary.totalRounds),
                  }),
              },
              {
                  label: t("instructor.exerciseInsights.kpis.fallbackRate"),
                  value: formatRate(insights.summary.fallbackRate),
                  hint: t("instructor.exerciseInsights.kpis.derivedExercises", {
                      count: formatNumber(insights.summary.derivedAiExerciseCount),
                  }),
              },
          ]
        : [];

    return (
        <div className="insights-page">
            <section className="insights-panel">
                <div className="insights-toolbar">
                    <div>
                        <h3>{t("instructor.exerciseInsights.filters.title")}</h3>
                        <p>{t("instructor.exerciseInsights.filters.subtitle")}</p>
                    </div>
                    <div className="insights-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleApplyFilters}
                            disabled={loading}
                        >
                            <Search size={16} />
                            {t("instructor.exerciseInsights.filters.apply")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={handleResetFilters}
                            disabled={loading}
                        >
                            <XCircle size={16} />
                            {t("instructor.exerciseInsights.filters.reset")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={loadInsights}
                            disabled={loading}
                        >
                            <RefreshCw size={16} />
                            {t("instructor.exerciseInsights.refresh")}
                        </button>
                    </div>
                </div>

                <div className="insights-filter-grid">
                    <select
                        className="input"
                        value={form.scope}
                        onChange={(event) =>
                            setForm((prev) => ({
                                ...prev,
                                scope: event.target.value as PracticeInsightsScope,
                            }))
                        }
                    >
                        {SCOPE_OPTIONS.map((scope) => (
                            <option key={scope} value={scope}>
                                {t(`instructor.exerciseInsights.scopes.${scope.toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                    <input
                        className="input"
                        type="date"
                        value={form.from}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, from: event.target.value }))
                        }
                        aria-label={t("instructor.exerciseInsights.filters.from")}
                    />
                    <input
                        className="input"
                        type="date"
                        value={form.to}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, to: event.target.value }))
                        }
                        aria-label={t("instructor.exerciseInsights.filters.to")}
                    />
                    <select
                        className="input"
                        value={form.submissionStatus}
                        onChange={(event) =>
                            setForm((prev) => ({
                                ...prev,
                                submissionStatus: event.target.value as SubmissionStatus | "",
                            }))
                        }
                    >
                        <option value="">
                            {t("instructor.exerciseInsights.filters.allSubmissionStatuses")}
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
                            {t("instructor.exerciseInsights.filters.allRoundStatuses")}
                        </option>
                        {ROUND_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {t(`admin.submissions.status.${status.toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                    <select
                        className="input"
                        value={form.roundNumber}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, roundNumber: event.target.value }))
                        }
                    >
                        <option value="">{t("instructor.exerciseInsights.filters.allRounds")}</option>
                        {[1, 2, 3].map((round) => (
                            <option key={round} value={round}>
                                {t("instructor.exerciseInsights.roundNumber", { number: round })}
                            </option>
                        ))}
                    </select>
                    <input
                        className="input"
                        value={form.provider}
                        onChange={(event) =>
                            setForm((prev) => ({ ...prev, provider: event.target.value }))
                        }
                        placeholder={t("instructor.exerciseInsights.filters.provider")}
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
                        <option value="">{t("instructor.exerciseInsights.filters.allFallback")}</option>
                        <option value="true">
                            {t("instructor.exerciseInsights.filters.fallbackOnly")}
                        </option>
                        <option value="false">
                            {t("instructor.exerciseInsights.filters.noFallback")}
                        </option>
                    </select>
                </div>
            </section>

            {loading ? (
                <p className="loading-text">{t("instructor.exerciseInsights.loading")}</p>
            ) : error ? (
                <div className="alert">
                    {error}
                    <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={loadInsights}>
                        {t("admin.submissions.retry")}
                    </button>
                </div>
            ) : insights ? (
                <>
                    {insights.scope.includedSubmissionCount === 0 && (
                        <div className="insights-empty">{t("instructor.exerciseInsights.empty")}</div>
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
                                    {insights.exercise.exerciseTitle ?? "-"}
                                </span>
                            </div>
                            <div className="detail-field">
                                <span className="detail-field__label">
                                    {t("instructor.exerciseInsights.exercise.source")}
                                </span>
                                <span
                                    className={`tag ${
                                        insights.exercise.exerciseSource === "AI_GENERATED" ? "tag--ai" : ""
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
                                    {t("instructor.exerciseInsights.exercise.derivedAiExerciseCount")}
                                </span>
                                <span className="detail-field__value">
                                    {formatNumber(insights.scope.derivedAiExerciseCount)}
                                </span>
                            </div>
                            <div className="detail-field">
                                <span className="detail-field__label">
                                    {t("instructor.exerciseInsights.exercise.includedSubmissionCount")}
                                </span>
                                <span className="detail-field__value">
                                    {formatNumber(insights.scope.includedSubmissionCount)}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="insights-metric-grid">
                        {summaryCards.map((card) => (
                            <article className="insights-card" key={card.label}>
                                <span className="insights-card__label">{card.label}</span>
                                <span className="insights-card__value">{card.value}</span>
                                <span className="insights-card__hint">{card.hint}</span>
                            </article>
                        ))}
                    </section>

                    <section className="insights-section-grid">
                        <article className="insights-panel">
                            <h3>{t("instructor.exerciseInsights.sections.topIssueTypes")}</h3>
                            {insights.topIssueTypes.length === 0 ? (
                                <p>{t("instructor.exerciseInsights.emptyPanel")}</p>
                            ) : (
                                <div className="insights-list">
                                    {insights.topIssueTypes.map((item, index) => (
                                        <div
                                            className="insights-list-row"
                                            key={`${item.errorType ?? "unknown"}-${index}`}
                                        >
                                            <div>
                                                <strong>
                                                    {item.errorType ??
                                                        t("instructor.exerciseInsights.unknown")}
                                                </strong>
                                                <span>
                                                    {t("instructor.exerciseInsights.affectedSubmissions", {
                                                        count: formatNumber(item.affectedSubmissionCount),
                                                    })}
                                                </span>
                                            </div>
                                            <strong>{formatNumber(item.count)}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>
                    </section>

                    <section className="insights-panel">
                        <div className="insights-toolbar">
                            <div>
                                <h3>
                                    {t("instructor.exerciseInsights.sections.anonymizedSubmissions")}
                                </h3>
                                <p>{t("instructor.exerciseInsights.anonymizedHint")}</p>
                            </div>
                            <span className="tag">
                                {t("instructor.exerciseInsights.totalSubmissions", {
                                    count: insights.anonymizedSubmissionSummaries.length,
                                })}
                            </span>
                        </div>
                        {insights.anonymizedSubmissionSummaries.length === 0 ? (
                            <div className="insights-empty">
                                {t("instructor.exerciseInsights.emptyPanel")}
                            </div>
                        ) : (
                            <div className="insights-table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>{t("instructor.exerciseInsights.columns.submission")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.scope")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.status")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.roundsUsed")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.latestRound")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.latestScore")}</th>
                                            <th>{t("instructor.exerciseInsights.columns.time")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {insights.anonymizedSubmissionSummaries.map((submission) => (
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
                                                    <span className={STATUS_CLASS[submission.submissionStatus]}>
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
                                                                STATUS_CLASS[submission.latestRoundStatus]
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
    );
};

const InstructorExerciseDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("info");

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        const load = async () => {
            if (!id) {
                setError(t("admin.exercises.detail.loadError"));
                setLoading(false);
                return;
            }
            const exerciseId = parseInt(id, 10);
            if (isNaN(exerciseId)) {
                setError(t("admin.exercises.detail.loadError"));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await instructorExerciseApi.getById(exerciseId);
                setExercise(data);
            } catch {
                setError(t("admin.exercises.detail.loadError"));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, t]);

    return (
        <InstructorLayout
            title={exercise?.exTitle || t("admin.exercises.detail.loading")}
            subtitle={exercise?.exerciseCode || ""}
            onSignOut={handleSignOut}
        >
            {/* Back breadcrumb */}
            <button
                type="button"
                className="btn btn-ghost"
                style={{ marginBottom: 16, paddingLeft: 0, fontWeight: 500 }}
                onClick={() => navigate("/instructor/exercises")}
            >
                {t("admin.exercises.detail.backToList")}
            </button>

            {loading && (
                <p className="loading-text">{t("admin.exercises.detail.loading")}</p>
            )}
            {error && <div className="alert">{error}</div>}

            {exercise && (
                <section className="section-card fade-in">
                    {/* Tab Bar */}
                    <div className="detail-tab-bar">
                        <button
                            type="button"
                            id="tab-info"
                            className={`detail-tab-btn ${activeTab === "info" ? "active" : ""}`}
                            onClick={() => setActiveTab("info")}
                        >
                            {t("admin.exercises.detail.tabInfo")}
                        </button>
                        <button
                            type="button"
                            id="tab-solution"
                            className={`detail-tab-btn ${activeTab === "solution" ? "active" : ""}`}
                            onClick={() => setActiveTab("solution")}
                        >
                            {t("admin.exercises.detail.tabSampleSolution")}
                        </button>
                        <button
                            type="button"
                            id="tab-insights"
                            className={`detail-tab-btn ${activeTab === "insights" ? "active" : ""}`}
                            onClick={() => setActiveTab("insights")}
                        >
                            {t("admin.exercises.detail.tabInsights")}
                        </button>
                    </div>

                    {/* Tab: Info */}
                    {activeTab === "info" && (
                        <div className="detail-tab-content stagger">
                            <div className="detail-field-grid">
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.code")}
                                    </span>
                                    <span className="detail-field__value">
                                        {exercise.exerciseCode || "—"}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.title")}
                                    </span>
                                    <span className="detail-field__value">{exercise.exTitle}</span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.source")}
                                    </span>
                                    <span
                                        className={`tag ${
                                            exercise.exerciseSource === "AI_GENERATED"
                                                ? "tag--ai"
                                                : ""
                                        }`}
                                    >
                                        {exercise.exerciseSource === "AI_GENERATED"
                                            ? t("admin.exercises.filters.aiGenerated")
                                            : t("admin.exercises.filters.manual")}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.published")}
                                    </span>
                                    <span
                                        className={`tag ${
                                            exercise.isPublished ? "tag--published" : ""
                                        }`}
                                    >
                                        {exercise.isPublished
                                            ? t("admin.exercises.yes")
                                            : t("admin.exercises.no")}
                                    </span>
                                </div>
                                {exercise.createdBy && (
                                    <div className="detail-field">
                                        <span className="detail-field__label">
                                            {t("admin.exercises.detail.fields.creator")}
                                        </span>
                                        <span className="detail-field__value">
                                            {exercise.createdBy.fullName} (
                                            {exercise.createdBy.userEmail})
                                        </span>
                                    </div>
                                )}
                                {exercise.exDescription && (
                                    <div className="detail-field detail-field--full">
                                        <span className="detail-field__label">
                                            {t("admin.exercises.detail.fields.description")}
                                        </span>
                                        <p className="detail-field__text">{exercise.exDescription}</p>
                                    </div>
                                )}
                            </div>

                            {/* ScenarioData viewer */}
                            <div className="detail-field" style={{ marginTop: 16 }}>
                                <span className="detail-field__label">
                                    {t("admin.exercises.detail.fields.scenarioData")}
                                </span>
                                <ScenarioViewer data={exercise.scenarioData} />
                            </div>
                        </div>
                    )}

                    {/* Tab: Sample Solution */}
                    {activeTab === "solution" && (
                        <div className="detail-tab-content">
                            <SampleSolutionEditor
                                exerciseId={exercise.exerciseId}
                                exerciseSource={exercise.exerciseSource}
                                apiType="instructor"
                            />
                        </div>
                    )}

                    {activeTab === "insights" && (
                        <div className="detail-tab-content">
                            <InstructorExerciseInsightsPanel exerciseId={exercise.exerciseId} />
                        </div>
                    )}
                </section>
            )}
        </InstructorLayout>
    );
};

export default InstructorExerciseDetailPage;
