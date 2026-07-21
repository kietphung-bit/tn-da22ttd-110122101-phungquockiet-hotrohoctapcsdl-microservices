import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Submission } from "../../types";
import {
    canContinueSubmission,
    getNextSubmissionRound,
    getSubmissionMaxRounds,
    getSubmissionRoundsUsed,
    shouldReopenSubmission,
} from "../../utils/submissionContinuation";

type ApiErrorLike = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

type SubmissionArchiveView = "active" | "archived";

type PendingSubmissionArchiveAction = {
    submission: Submission;
    archived: boolean;
};

const formatDateTime = (value: string | null | undefined) => {
    return value ? new Date(value).toLocaleString() : "-";
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const candidate = error as ApiErrorLike;
    return candidate.response?.data?.message || candidate.message || fallback;
};

const StudentSubmissionHistoryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(false);
    const [continuingId, setContinuingId] = useState<number | null>(null);
    const [archiveActionId, setArchiveActionId] = useState<number | null>(null);
    const [pendingArchiveAction, setPendingArchiveAction] =
        useState<PendingSubmissionArchiveAction | null>(null);
    const [archiveView, setArchiveView] = useState<SubmissionArchiveView>("active");
    const [errorMsg, setErrorMsg] = useState("");

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const data = await studentSubmissionApi.getAll({ archived: archiveView === "archived" });
            setSubmissions(data);
        } catch (error: unknown) {
            console.error("Failed to fetch submissions:", error);
            setErrorMsg(getErrorMessage(error, t("student.submissionHistory.errors.load")));
        } finally {
            setLoading(false);
        }
    }, [archiveView, t]);

    useEffect(() => {
        const init = async () => {
            await fetchSubmissions();
        };
        init();
    }, [fetchSubmissions]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const handleContinue = async (submission: Submission) => {
        setErrorMsg("");

        if (submission.submissionStatus === "DRAFT") {
            navigate(`/student/workspace/${submission.submissionId}`);
            return;
        }

        if (!canContinueSubmission(submission) || !shouldReopenSubmission(submission)) {
            return;
        }

        setContinuingId(submission.submissionId);
        try {
            const latestSubmission = await studentSubmissionApi.getById(submission.submissionId);
            if (latestSubmission.submissionStatus === "DRAFT") {
                navigate(`/student/workspace/${latestSubmission.submissionId}`);
                return;
            }
            if (!canContinueSubmission(latestSubmission) || !shouldReopenSubmission(latestSubmission)) {
                setSubmissions((current) => current.map((item) => (
                    item.submissionId === latestSubmission.submissionId ? latestSubmission : item
                )));
                setErrorMsg(t("student.submissionHistory.errors.noRounds"));
                return;
            }

            const updated = await studentSubmissionApi.updateDraft(latestSubmission.submissionId, {
                diagramData: latestSubmission.diagramData ?? {},
            });
            navigate(`/student/workspace/${updated.submissionId}`);
        } catch (error: unknown) {
            setErrorMsg(getErrorMessage(error, t("student.submissionHistory.errors.reopen")));
        } finally {
            setContinuingId(null);
        }
    };

    const requestArchiveToggle = (submission: Submission, archived: boolean) => {
        setPendingArchiveAction({ submission, archived });
    };

    const handleArchiveToggle = async (submission: Submission, archived: boolean) => {
        setArchiveActionId(submission.submissionId);
        setErrorMsg("");
        try {
            const updated = archived
                ? await studentSubmissionApi.archive(submission.submissionId)
                : await studentSubmissionApi.restore(submission.submissionId);
            const shouldRemainInCurrentView = Boolean(updated.studentArchived) === (archiveView === "archived");
            setSubmissions((current) => {
                if (!shouldRemainInCurrentView) {
                    return current.filter((item) => item.submissionId !== updated.submissionId);
                }
                return current.map((item) => item.submissionId === updated.submissionId ? updated : item);
            });
        } catch (error: unknown) {
            setErrorMsg(getErrorMessage(
                error,
                archived
                    ? t("student.submissionHistory.errors.archive")
                    : t("student.submissionHistory.errors.restore")
            ));
        } finally {
            setArchiveActionId(null);
        }
    };

    const handleConfirmArchiveToggle = () => {
        const action = pendingArchiveAction;
        if (!action) {
            return;
        }
        setPendingArchiveAction(null);
        void handleArchiveToggle(action.submission, action.archived);
    };

    const isArchivedView = archiveView === "archived";
    const pendingArchiveKind = pendingArchiveAction?.archived ? "archive" : "restore";

    return (
        <StudentLayout title={t("student.submissionHistory.title")} onSignOut={handleSignOut}>
            <ConfirmDialog
                open={Boolean(pendingArchiveAction)}
                title={t(`student.submissionHistory.confirmations.${pendingArchiveKind}.title`)}
                message={t(`student.submissionHistory.confirmations.${pendingArchiveKind}.message`)}
                confirmLabel={t(`student.submissionHistory.actions.${pendingArchiveKind}`)}
                cancelLabel={t("common.cancel")}
                variant={pendingArchiveAction?.archived ? "warning" : "normal"}
                onCancel={() => setPendingArchiveAction(null)}
                onConfirm={handleConfirmArchiveToggle}
            />
            <div className="page-header">
                <div>
                    <h2>{t("student.submissionHistory.title")}</h2>
                    <p className="detail-field__text">{t("student.submissionHistory.subtitle")}</p>
                </div>
                <div
                    className="action-group"
                    role="tablist"
                    aria-label={t("student.submissionHistory.filters.ariaLabel")}
                >
                    <button
                        className={`btn btn-sm ${archiveView === "active" ? "btn-primary" : "btn-outline"}`}
                        type="button"
                        role="tab"
                        aria-selected={archiveView === "active"}
                        onClick={() => setArchiveView("active")}
                    >
                        {t("student.submissionHistory.filters.active")}
                    </button>
                    <button
                        className={`btn btn-sm ${archiveView === "archived" ? "btn-primary" : "btn-outline"}`}
                        type="button"
                        role="tab"
                        aria-selected={archiveView === "archived"}
                        onClick={() => setArchiveView("archived")}
                    >
                        {t("student.submissionHistory.filters.archived")}
                    </button>
                </div>
            </div>

            {errorMsg && <div className="alert">{errorMsg}</div>}

            {loading ? (
                <div className="loading-text">{t("student.submissionHistory.loading")}</div>
            ) : (
                <div className="section-card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("student.submissionHistory.columns.id")}</th>
                                <th>{t("student.submissionHistory.columns.exerciseCode")}</th>
                                <th>{t("student.submissionHistory.columns.exerciseTitle")}</th>
                                <th>{t("student.submissionHistory.columns.status")}</th>
                                <th>{t("student.submissionHistory.columns.rounds")}</th>
                                {/* <th>{t("student.submissionHistory.columns.createdAt")}</th> */}
                                <th>{t("student.submissionHistory.columns.submittedAt")}</th>
                                <th>{t("student.submissionHistory.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center">
                                        {isArchivedView
                                            ? t("student.submissionHistory.emptyArchived")
                                            : t("student.submissionHistory.empty")}
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => {
                                    const maxRounds = getSubmissionMaxRounds(sub);
                                    const roundsUsed = getSubmissionRoundsUsed(sub);
                                    const canContinue = canContinueSubmission(sub);
                                    const nextRound = getNextSubmissionRound(sub);
                                    return (
                                        <tr key={sub.submissionId}>
                                            <td>{sub.submissionId}</td>
                                            <td>{sub.exerciseCode ?? "-"}</td>
                                            <td>{sub.exerciseTitle}</td>
                                            <td>
                                                <span className={`tag tag--${sub.submissionStatus.toLowerCase()}`}>
                                                    {t(`student.submissionStatus.${sub.submissionStatus}`)}
                                                </span>
                                            </td>
                                            <td>{t("student.submissionHistory.roundCounter", { used: roundsUsed, max: maxRounds })}</td>
                                            {/* <td>{formatDateTime(sub.createdAt)}</td> */}
                                            <td>{formatDateTime(sub.submittedAt)}</td>
                                            <td>
                                                <div className="action-group">
                                                    <button
                                                        onClick={() => navigate(`/student/submissions/${sub.submissionId}`)}
                                                        className="btn btn-sm btn-outline"
                                                        type="button"
                                                    >
                                                        {t("student.submissionHistory.actions.viewDetail")}
                                                    </button>
                                                    {canContinue && (
                                                        <button
                                                            onClick={() => handleContinue(sub)}
                                                            className="btn btn-sm btn-primary"
                                                            type="button"
                                                            disabled={continuingId === sub.submissionId}
                                                        >
                                                            {continuingId === sub.submissionId
                                                                ? t("student.submissionHistory.actions.reopening")
                                                                : sub.submissionStatus === "DRAFT"
                                                                    ? t("student.submissionHistory.actions.openDraft")
                                                                    : t("student.submissionHistory.actions.continue", {
                                                                        round: nextRound,
                                                                        max: maxRounds,
                                                                    })}
                                                        </button>
                                                    )}
                                                    {isArchivedView ? (
                                                        <button
                                                            onClick={() => requestArchiveToggle(sub, false)}
                                                            className="btn btn-sm btn-outline"
                                                            type="button"
                                                            disabled={archiveActionId === sub.submissionId}
                                                        >
                                                            {archiveActionId === sub.submissionId
                                                                ? t("student.submissionHistory.actions.restoring")
                                                                : t("student.submissionHistory.actions.restore")}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => requestArchiveToggle(sub, true)}
                                                            className="btn btn-sm btn-outline"
                                                            type="button"
                                                            disabled={archiveActionId === sub.submissionId}
                                                        >
                                                            {archiveActionId === sub.submissionId
                                                                ? t("student.submissionHistory.actions.archiving")
                                                                : t("student.submissionHistory.actions.archive")}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </StudentLayout>
    );
};

export default StudentSubmissionHistoryPage;
