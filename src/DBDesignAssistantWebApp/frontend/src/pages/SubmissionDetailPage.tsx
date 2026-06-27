import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "../components/layouts/AdminLayout";
import ReadOnlyErdViewer from "../components/viewers/ReadOnlyErdViewer";
import { submissionApi } from "../services";
import { useAuth } from "../hooks/useAuth";
import type { EvaluationRound, Submission, SubmissionStatus } from "../types";

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

const IconBack = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const sortRounds = (rounds: EvaluationRound[] | null | undefined) => {
    return [...(rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);
};

export default function SubmissionDetailPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { id } = useParams<{ id: string }>();

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await submissionApi.getSubmissionById(Number(id));
                setSubmission(data);
            } catch {
                setError(t("admin.submissions.detail.loadError"));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, t]);

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const formatFallback = (round: EvaluationRound) => {
        if (round.fallbackUsed) {
            return round.fallbackFrom
                ? t("admin.submissions.detail.roundHistory.fallbackFrom", { provider: round.fallbackFrom })
                : t("admin.submissions.detail.roundHistory.fallbackYes");
        }
        return t("admin.submissions.detail.roundHistory.fallbackNo");
    };

    const evaluationRounds = sortRounds(submission?.evaluationRounds);
    const maxRounds = submission?.maxRounds ?? 3;

    return (
        <AdminLayout
            title={t("admin.submissions.detail.title")}
            subtitle={t("admin.submissions.detail.subtitle")}
            onSignOut={handleSignOut}
        >
            {/* Back button */}
            <button
                type="button"
                className="btn btn-ghost"
                style={{ marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 8 }}
                onClick={() => navigate("/admin/submissions")}
            >
                <IconBack />
                {t("admin.submissions.detail.backToList")}
            </button>

            {loading ? (
                <p>{t("admin.submissions.detail.loading")}</p>
            ) : error ? (
                <div className="alert">{error}</div>
            ) : !submission ? null : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* ── Basic Info Card ── */}
                    <section className="section-card">
                        <h2 style={{ marginTop: 0, marginBottom: 16 }}>
                            {t("admin.submissions.detail.infoTitle")}
                        </h2>
                        <dl className="detail-grid">
                            <dt>{t("admin.submissions.detail.fields.submissionId")}</dt>
                            <dd><code>#{submission.submissionId}</code></dd>

                            <dt>{t("admin.submissions.detail.fields.status")}</dt>
                            <dd>
                                <span className={STATUS_CLASS[submission.submissionStatus]}>
                                    {t(`admin.submissions.status.${submission.submissionStatus.toLowerCase()}`)}
                                </span>
                            </dd>

                            <dt>{t("admin.submissions.detail.fields.student")}</dt>
                            <dd>
                                <div style={{ fontWeight: 500 }}>{submission.userFullName}</div>
                                <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                                    {submission.userEmail}
                                </div>
                            </dd>

                            <dt>{t("admin.submissions.detail.fields.exercise")}</dt>
                            <dd>
                                <code style={{ fontSize: "0.85rem" }}>{submission.exerciseCode}</code>
                                {" — "}
                                <span style={{ fontWeight: 500 }}>{submission.exerciseTitle}</span>
                            </dd>

                            <dt>{t("admin.submissions.detail.fields.createdAt")}</dt>
                            <dd>{formatDate(submission.createdAt)}</dd>

                            <dt>{t("admin.submissions.detail.fields.submittedAt")}</dt>
                            <dd>{formatDate(submission.submittedAt)}</dd>
                        </dl>
                    </section>

                    {/* ── Diagram Data Card ── */}
                    <section className="section-card">
                        <h2 style={{ marginTop: 0, marginBottom: 12 }}>
                            {t("admin.submissions.detail.diagramTitle")}
                        </h2>
                        <ReadOnlyErdViewer data={submission.diagramData} />
                    </section>

                    {/* ── AI Evaluation Card ── */}
                    <section className="section-card">
                        <h2 style={{ marginTop: 0, marginBottom: 12 }}>
                            {t("admin.submissions.detail.evaluationTitle")}
                        </h2>
                        {!submission.evaluation ? (
                            <p style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
                                {t("admin.submissions.detail.noEvaluation")}
                            </p>
                        ) : (
                            <>
                                {/* Score */}
                                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                                    <div className="score-badge">
                                        <span className="score-badge__value">
                                            {submission.evaluation.overallScore !== null
                                                ? submission.evaluation.overallScore
                                                : "—"}
                                        </span>
                                        <span className="score-badge__label">
                                            {t("admin.submissions.detail.score")}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                                        {t("admin.submissions.detail.evaluatedAt")}{" "}
                                        {formatDate(submission.evaluation.evaluatedAt)}
                                    </div>
                                </div>

                                {/* Evaluation Details */}
                                {!submission.evaluation.details || submission.evaluation.details.length === 0 ? (
                                    <p style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
                                        {t("admin.submissions.detail.noDetails")}
                                    </p>
                                ) : (
                                    <>
                                        <h3 style={{ marginBottom: 12, fontSize: "1rem" }}>
                                            {t("admin.submissions.detail.detailsTitle")} ({submission.evaluation.details.length})
                                        </h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                            {submission.evaluation.details.map((detail, idx) => (
                                                <div key={detail.detailId} className="eval-detail-card">
                                                    <div className="eval-detail-card__header">
                                                        <span className="eval-detail-card__index">#{idx + 1}</span>
                                                        <span className="eval-detail-card__type">
                                                            {detail.errorType || "-"}
                                                        </span>
                                                        {detail.errorLocation && (
                                                            <span className="eval-detail-card__location">
                                                                📍 {detail.errorLocation}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="eval-detail-card__desc">
                                                        {detail.evaDescription || "-"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </section>

                    <section className="section-card">
                        <div className="feedback-block-header" style={{ marginBottom: 12 }}>
                            <div>
                                <h2 style={{ margin: 0 }}>
                                    {t("admin.submissions.detail.roundHistory.title")}
                                </h2>
                                <p className="detail-field__text" style={{ marginTop: 4 }}>
                                    {t("admin.submissions.detail.roundHistory.subtitle")}
                                </p>
                            </div>
                            <span className="tag">
                                {t("admin.submissions.detail.roundHistory.total", { count: evaluationRounds.length })}
                            </span>
                        </div>

                        {evaluationRounds.length === 0 ? (
                            <p style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>
                                {t("admin.submissions.detail.roundHistory.empty")}
                            </p>
                        ) : (
                            <div className="round-history-list" style={{ borderTop: "none", paddingTop: 0 }}>
                                {evaluationRounds.map((round) => (
                                    <details
                                        className="round-history-item"
                                        key={round.roundId}
                                        open={round.roundStatus !== "GRADED"}
                                    >
                                        <summary>
                                            <span>
                                                {t("admin.submissions.detail.roundHistory.roundWithMax", {
                                                    round: round.roundNumber,
                                                    max: maxRounds,
                                                })}
                                            </span>
                                            <span className={STATUS_CLASS[round.roundStatus]}>
                                                {t(`admin.submissions.status.${round.roundStatus.toLowerCase()}`)}
                                            </span>
                                            <span>{round.overallScore ?? "-"} / 100</span>
                                        </summary>
                                        <div className="round-history-body">
                                            <div className="detail-field-grid">
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.roundNumber")}
                                                    </span>
                                                    <span className="detail-field__value">{round.roundNumber}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.roundStatus")}
                                                    </span>
                                                    <span className={STATUS_CLASS[round.roundStatus]}>
                                                        {t(`admin.submissions.status.${round.roundStatus.toLowerCase()}`)}
                                                    </span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.overallScore")}
                                                    </span>
                                                    <span className="detail-field__value">{round.overallScore ?? "-"}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.provider")}
                                                    </span>
                                                    <span className="detail-field__value">{round.provider ?? "-"}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.model")}
                                                    </span>
                                                    <span className="detail-field__value">{round.model ?? "-"}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.fallbackUsed")}
                                                    </span>
                                                    <span className="detail-field__value">{formatFallback(round)}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.submittedAt")}
                                                    </span>
                                                    <span className="detail-field__value">{formatDate(round.submittedAt)}</span>
                                                </div>
                                                <div className="detail-field">
                                                    <span className="detail-field__label">
                                                        {t("admin.submissions.detail.roundHistory.fields.gradedAt")}
                                                    </span>
                                                    <span className="detail-field__value">{formatDate(round.gradedAt)}</span>
                                                </div>
                                            </div>

                                            {round.details && round.details.length > 0 ? (
                                                <div>
                                                    <h3 style={{ margin: "4px 0 12px", fontSize: "1rem" }}>
                                                        {t("admin.submissions.detail.roundHistory.detailsTitle")} ({round.details.length})
                                                    </h3>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                        {round.details.map((detail, idx) => (
                                                            <div
                                                                key={detail.detailId ?? `${round.roundId}-${idx}`}
                                                                className="eval-detail-card"
                                                            >
                                                                <div className="eval-detail-card__header">
                                                                    <span className="eval-detail-card__index">#{idx + 1}</span>
                                                                    <span className="eval-detail-card__type">
                                                                        {detail.errorType || "-"}
                                                                    </span>
                                                                    {detail.errorLocation && (
                                                                        <span className="eval-detail-card__location">
                                                                            {detail.errorLocation}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="eval-detail-card__desc">
                                                                    {detail.evaDescription || "-"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="detail-field__text">
                                                    {t("admin.submissions.detail.roundHistory.noDetails")}
                                                </p>
                                            )}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </AdminLayout>
    );
}
