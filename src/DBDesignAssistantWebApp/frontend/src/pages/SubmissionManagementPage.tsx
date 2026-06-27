import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "../components/layouts/AdminLayout";
import { submissionApi } from "../services";
import { useAuth } from "../hooks/useAuth";
import type { Submission, SubmissionStatus } from "../types";

const STATUS_OPTIONS: SubmissionStatus[] = ["DRAFT", "SUBMITTED", "PROCESSING", "GRADED", "FAILED"];

const STATUS_CLASS: Record<SubmissionStatus, string> = {
    DRAFT: "tag tag--draft",
    SUBMITTED: "tag tag--submitted",
    PROCESSING: "tag tag--processing",
    GRADED: "tag tag--graded",
    FAILED: "tag tag--failed",
};

import { Eye } from "lucide-react";

export default function SubmissionManagementPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<SubmissionStatus | "">("");

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await submissionApi.getSubmissions(
                filterStatus ? { status: filterStatus } : undefined
            );
            setSubmissions(data);
        } catch {
            setError(t("admin.submissions.loadError"));
        } finally {
            setLoading(false);
        }
    }, [filterStatus, t]);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();
    }, [load]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <AdminLayout
            title={t("admin.submissions.title")}
            subtitle={t("admin.submissions.subtitle")}
            onSignOut={handleSignOut}
        >
            <section className="section-card">
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{t("admin.submissions.title")}</h2>
                        <p style={{ margin: "4px 0 0", color: "var(--ink-soft)" }}>{t("admin.submissions.subtitle")}</p>
                    </div>
                </div>

                {/* Filter bar */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
                    <select
                        id="filter-submission-status"
                        className="input"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as SubmissionStatus | "")}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">{t("admin.submissions.allStatuses")}</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {t(`admin.submissions.status.${s.toLowerCase()}`)}
                            </option>
                        ))}
                    </select>
                    <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>
                        {t("admin.submissions.total", { count: submissions.length })}
                    </span>
                </div>

                {/* Content */}
                {loading ? (
                    <p>{t("admin.submissions.loading")}</p>
                ) : error ? (
                    <div className="alert">
                        {error}
                        <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={load}>
                            {t("admin.submissions.retry")}
                        </button>
                    </div>
                ) : submissions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-soft)" }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
                        <p>{t("admin.submissions.empty")}</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t("admin.submissions.columns.student")}</th>
                                <th>{t("admin.submissions.columns.exercise")}</th>
                                <th>{t("admin.submissions.columns.status")}</th>
                                <th>{t("admin.submissions.columns.submittedAt")}</th>
                                <th style={{ width: 80 }}>{t("admin.submissions.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((sub) => (
                                <tr key={sub.submissionId}>
                                    <td>
                                        <code style={{ fontSize: "0.85rem" }}>{sub.submissionId}</code>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{sub.userFullName}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>{sub.userEmail}</div>
                                    </td>
                                    <td>
                                        <code style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                                            {sub.exerciseCode}
                                        </code>
                                        <div style={{ fontWeight: 500 }}>{sub.exerciseTitle}</div>
                                    </td>
                                    <td>
                                        <span className={STATUS_CLASS[sub.submissionStatus]}>
                                            {t(`admin.submissions.status.${sub.submissionStatus.toLowerCase()}`)}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                                        {formatDate(sub.submittedAt ?? sub.createdAt)}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                id={`btn-view-sub-${sub.submissionId}`}
                                                type="button"
                                                className="btn btn-icon"
                                                title={t("admin.submissions.viewDetail")}
                                                onClick={() => navigate(`/admin/submissions/${sub.submissionId}`)}
                                                aria-label={t("admin.submissions.viewDetail")}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
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
