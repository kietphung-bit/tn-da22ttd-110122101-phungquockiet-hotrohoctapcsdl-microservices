import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, RefreshCw } from "lucide-react";
import AdminLayout from "../components/layouts/AdminLayout";
import { submissionApi } from "../services";
import { useAuth } from "../hooks/useAuth";
import type { AdminEvaluationRound, SubmissionStatus } from "../types";

const STATUS_OPTIONS: SubmissionStatus[] = ["PROCESSING", "GRADED", "FAILED"];

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

type FallbackFilter = "" | "true" | "false";

export default function EvaluationRoundMonitoringPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [rounds, setRounds] = useState<AdminEvaluationRound[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<SubmissionStatus | "">("FAILED");
    const [filterProvider, setFilterProvider] = useState("");
    const [filterFallback, setFilterFallback] = useState<FallbackFilter>("");
    const [filterSubmissionId, setFilterSubmissionId] = useState("");
    const [filterStudentId, setFilterStudentId] = useState("");

    const filters = useMemo(() => {
        const submissionId = Number(filterSubmissionId);
        const studentId = Number(filterStudentId);
        return {
            ...(filterStatus ? { status: filterStatus } : {}),
            ...(filterProvider.trim() ? { provider: filterProvider.trim() } : {}),
            ...(filterFallback ? { fallbackUsed: filterFallback === "true" } : {}),
            ...(Number.isInteger(submissionId) && submissionId > 0 ? { submissionId } : {}),
            ...(Number.isInteger(studentId) && studentId > 0 ? { studentId } : {}),
        };
    }, [filterFallback, filterProvider, filterStatus, filterStudentId, filterSubmissionId]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await submissionApi.getEvaluationRounds(filters);
            setRounds(data);
        } catch {
            setError(t("admin.evaluationRounds.loadError"));
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

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatFallback = (round: AdminEvaluationRound) => {
        if (round.fallbackUsed) {
            return round.fallbackFrom
                ? t("admin.evaluationRounds.fallbackFrom", { provider: round.fallbackFrom })
                : t("admin.evaluationRounds.fallbackYes");
        }
        return t("admin.evaluationRounds.fallbackNo");
    };

    return (
        <AdminLayout
            title={t("admin.evaluationRounds.title")}
            subtitle={t("admin.evaluationRounds.subtitle")}
            onSignOut={handleSignOut}
        >
            <section className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{t("admin.evaluationRounds.title")}</h2>
                        <p style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>
                            {t("admin.evaluationRounds.subtitle")}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={load}
                        disabled={loading}
                        title={t("admin.evaluationRounds.refresh")}
                    >
                        <RefreshCw size={16} />
                        {t("admin.evaluationRounds.refresh")}
                    </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
                    <select
                        className="input"
                        value={filterStatus}
                        onChange={(event) => setFilterStatus(event.target.value as SubmissionStatus | "")}
                        aria-label={t("admin.evaluationRounds.filters.status")}
                    >
                        <option value="">{t("admin.evaluationRounds.filters.allStatuses")}</option>
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {t(`admin.submissions.status.${status.toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                    <input
                        className="input"
                        value={filterProvider}
                        onChange={(event) => setFilterProvider(event.target.value)}
                        placeholder={t("admin.evaluationRounds.filters.provider")}
                    />
                    <select
                        className="input"
                        value={filterFallback}
                        onChange={(event) => setFilterFallback(event.target.value as FallbackFilter)}
                        aria-label={t("admin.evaluationRounds.filters.fallback")}
                    >
                        <option value="">{t("admin.evaluationRounds.filters.allFallback")}</option>
                        <option value="true">{t("admin.evaluationRounds.filters.fallbackOnly")}</option>
                        <option value="false">{t("admin.evaluationRounds.filters.noFallback")}</option>
                    </select>
                    <input
                        className="input"
                        type="number"
                        min="1"
                        value={filterSubmissionId}
                        onChange={(event) => setFilterSubmissionId(event.target.value)}
                        placeholder={t("admin.evaluationRounds.filters.submissionId")}
                    />
                    <input
                        className="input"
                        type="number"
                        min="1"
                        value={filterStudentId}
                        onChange={(event) => setFilterStudentId(event.target.value)}
                        placeholder={t("admin.evaluationRounds.filters.studentId")}
                    />
                </div>

                <div style={{ marginBottom: 16, color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                    {t("admin.evaluationRounds.total", { count: rounds.length })}
                </div>

                {loading ? (
                    <p>{t("admin.evaluationRounds.loading")}</p>
                ) : error ? (
                    <div className="alert">
                        {error}
                        <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={load}>
                            {t("admin.submissions.retry")}
                        </button>
                    </div>
                ) : rounds.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-soft)" }}>
                        <p>{t("admin.evaluationRounds.empty")}</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("admin.evaluationRounds.columns.round")}</th>
                                <th>{t("admin.evaluationRounds.columns.submission")}</th>
                                <th>{t("admin.evaluationRounds.columns.student")}</th>
                                <th>{t("admin.evaluationRounds.columns.status")}</th>
                                <th>{t("admin.evaluationRounds.columns.score")}</th>
                                <th>{t("admin.evaluationRounds.columns.provider")}</th>
                                <th>{t("admin.evaluationRounds.columns.fallback")}</th>
                                <th>{t("admin.evaluationRounds.columns.time")}</th>
                                <th style={{ width: 80 }}>{t("admin.evaluationRounds.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rounds.map((round) => (
                                <tr key={round.roundId}>
                                    <td>
                                        <code>#{round.roundId}</code>
                                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                                            {t("admin.evaluationRounds.roundNumber", { number: round.roundNumber })}
                                        </div>
                                    </td>
                                    <td>
                                        <code>#{round.submissionId}</code>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{round.studentName ?? "-"}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                                            {round.studentEmail ?? "-"}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={STATUS_CLASS[round.roundStatus]}>
                                            {t(`admin.submissions.status.${round.roundStatus.toLowerCase()}`)}
                                        </span>
                                    </td>
                                    <td>{round.overallScore ?? "-"}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{round.provider ?? "-"}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                                            {round.model ?? "-"}
                                        </div>
                                    </td>
                                    <td>{formatFallback(round)}</td>
                                    <td style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                                        <div>{formatDate(round.submittedAt)}</div>
                                        <div>{formatDate(round.gradedAt)}</div>
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-icon"
                                            title={t("admin.evaluationRounds.viewSubmission")}
                                            aria-label={t("admin.evaluationRounds.viewSubmission")}
                                            onClick={() => navigate(`/admin/submissions/${round.submissionId}`)}
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </AdminLayout>
    );
}
