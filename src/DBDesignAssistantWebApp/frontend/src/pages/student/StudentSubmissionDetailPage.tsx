import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/layouts/StudentLayout";
import ReadOnlyErdViewer from "../../components/viewers/ReadOnlyErdViewer";
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

const formatDateTime = (value: string | null | undefined) => {
    return value ? new Date(value).toLocaleString() : "-";
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const candidate = error as ApiErrorLike;
    return candidate.response?.data?.message || candidate.message || fallback;
};

const StudentSubmissionDetailPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(false);
    const [continuing, setContinuing] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!id) return;

        let isCancelled = false;
        const fetchSubmission = async (subId: number) => {
            try {
                setLoading(true);
                setErrorMsg("");
                const data = await studentSubmissionApi.getById(subId);
                if (!isCancelled) {
                    setSubmission(data);
                }
            } catch (error: unknown) {
                console.error("Failed to fetch submission details:", error);
                if (!isCancelled) {
                    setErrorMsg(getErrorMessage(error, t("student.submissionDetail.errors.load")));
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchSubmission(Number(id));

        return () => {
            isCancelled = true;
        };
    }, [id, t]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const sortedRounds = useMemo(() => {
        return [...(submission?.evaluationRounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);
    }, [submission?.evaluationRounds]);

    const handleContinue = async () => {
        if (!submission) return;

        setErrorMsg("");

        if (submission.submissionStatus === "DRAFT") {
            navigate(`/student/workspace/${submission.submissionId}`);
            return;
        }

        if (!canContinueSubmission(submission) || !shouldReopenSubmission(submission)) {
            return;
        }

        setContinuing(true);
        try {
            const latestSubmission = await studentSubmissionApi.getById(submission.submissionId);
            if (latestSubmission.submissionStatus === "DRAFT") {
                navigate(`/student/workspace/${latestSubmission.submissionId}`);
                return;
            }
            if (!canContinueSubmission(latestSubmission) || !shouldReopenSubmission(latestSubmission)) {
                setSubmission(latestSubmission);
                setErrorMsg(t("student.submissionDetail.errors.noRounds"));
                return;
            }

            const updated = await studentSubmissionApi.updateDraft(latestSubmission.submissionId, {
                diagramData: latestSubmission.diagramData ?? {},
            });
            navigate(`/student/workspace/${updated.submissionId}`);
        } catch (error: unknown) {
            setErrorMsg(getErrorMessage(error, t("student.submissionDetail.errors.reopen")));
        } finally {
            setContinuing(false);
        }
    };

    if (loading) {
        return (
            <StudentLayout title={t("student.submissionDetail.loadingTitle")} onSignOut={handleSignOut}>
                <div className="loading-text">{t("student.submissionDetail.loading")}</div>
            </StudentLayout>
        );
    }

    if (!submission) {
        return (
            <StudentLayout title={t("student.submissionDetail.notFoundTitle")} onSignOut={handleSignOut}>
                {errorMsg ? <div className="alert">{errorMsg}</div> : <div>{t("student.submissionDetail.notFound")}</div>}
            </StudentLayout>
        );
    }

    const maxRounds = getSubmissionMaxRounds(submission);
    const roundsUsed = getSubmissionRoundsUsed(submission);
    const nextRound = getNextSubmissionRound(submission);
    const canContinue = canContinueSubmission(submission);
    const roundsExhausted = roundsUsed >= maxRounds;
    const isWaitingForEvaluation = submission.submissionStatus === "SUBMITTED" || submission.submissionStatus === "PROCESSING";

    return (
        <StudentLayout title={t("student.submissionDetail.title", { title: submission.exerciseTitle })} onSignOut={handleSignOut}>
            <div className="page-header">
                <div>
                    <h2>{t("student.submissionDetail.title", { title: submission.exerciseTitle })}</h2>
                    <div className="tags-list">
                        <span className={`tag tag--${submission.submissionStatus.toLowerCase()}`}>
                            {t(`student.submissionStatus.${submission.submissionStatus}`)}
                        </span>
                        {submission.exerciseCode && <span className="tag">{submission.exerciseCode}</span>}
                        <span className="tag">
                            {t("student.submissionDetail.roundCounter", { used: roundsUsed, max: maxRounds })}
                        </span>
                    </div>
                </div>
                <div className="action-group">
                    <button
                        onClick={() => navigate("/student/submissions")}
                        className="btn btn-outline"
                        type="button"
                    >
                        {t("student.submissionDetail.actions.back")}
                    </button>
                    {canContinue && (
                        <button
                            onClick={handleContinue}
                            className="btn btn-primary"
                            type="button"
                            disabled={continuing}
                        >
                            {continuing
                                ? t("student.submissionDetail.actions.reopening")
                                : submission.submissionStatus === "DRAFT"
                                    ? t("student.submissionDetail.actions.openDraft")
                                    : t("student.submissionDetail.actions.continue", { round: nextRound, max: maxRounds })}
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && <div className="alert">{errorMsg}</div>}

            {canContinue ? (
                <div className="info-notice" style={{ marginBottom: 16 }}>
                    <p className="detail-field__text" style={{ margin: 0 }}>
                        {submission.submissionStatus === "DRAFT"
                            ? t("student.submissionDetail.notices.draft")
                            : t("student.submissionDetail.notices.canContinue", { round: nextRound, max: maxRounds })}
                    </p>
                </div>
            ) : roundsExhausted ? (
                <div className="info-notice info-notice--soft" style={{ marginBottom: 16 }}>
                    <p className="detail-field__text" style={{ margin: 0 }}>
                        {t("student.submissionDetail.notices.exhausted")}
                    </p>
                </div>
            ) : isWaitingForEvaluation ? (
                <div className="info-notice" style={{ marginBottom: 16 }}>
                    <p className="detail-field__text" style={{ margin: 0 }}>
                        {t("student.submissionDetail.notices.processing")}
                    </p>
                </div>
            ) : null}

            <div className="section-card mb-4">
                <div className="detail-field-grid">
                    <div className="detail-field">
                        <span className="detail-field__label">{t("student.submissionDetail.fields.exerciseCode")}</span>
                        <span className="detail-field__value">{submission.exerciseCode ?? "-"}</span>
                    </div>
                    <div className="detail-field">
                        <span className="detail-field__label">{t("student.submissionDetail.fields.status")}</span>
                        <span className={`tag tag--${submission.submissionStatus.toLowerCase()}`}>
                            {t(`student.submissionStatus.${submission.submissionStatus}`)}
                        </span>
                    </div>
                    <div className="detail-field">
                        <span className="detail-field__label">{t("student.submissionDetail.fields.createdAt")}</span>
                        <span className="detail-field__value">{formatDateTime(submission.createdAt)}</span>
                    </div>
                    <div className="detail-field">
                        <span className="detail-field__label">{t("student.submissionDetail.fields.submittedAt")}</span>
                        <span className="detail-field__value">{formatDateTime(submission.submittedAt)}</span>
                    </div>
                </div>
            </div>

            <div className="section-card mb-4">
                <h3 style={{ margin: 0, marginBottom: "16px" }}>{t("student.submissionDetail.diagram.title")}</h3>
                <ReadOnlyErdViewer data={submission.diagramData} />
            </div>

            <div className="section-card">
                <div className="feedback-block-header">
                    <div>
                        <h3 style={{ margin: 0 }}>{t("student.submissionDetail.evaluation.title")}</h3>
                        <p className="detail-field__text">{t("student.submissionDetail.evaluation.help")}</p>
                    </div>
                    {canContinue && (
                        <button
                            onClick={handleContinue}
                            className="btn btn-primary"
                            type="button"
                            disabled={continuing}
                        >
                            {continuing
                                ? t("student.submissionDetail.actions.reopening")
                                : t("student.submissionDetail.actions.continue", { round: nextRound, max: maxRounds })}
                        </button>
                    )}
                </div>

                {submission.evaluation ? (
                    <div className="detail-field-grid">
                        <div className="detail-field">
                            <span className="detail-field__label">{t("student.submissionDetail.evaluation.score")}</span>
                            <span className="detail-field__value">{submission.evaluation.overallScore ?? "-"} / 100</span>
                        </div>
                        <div className="detail-field">
                            <span className="detail-field__label">{t("student.submissionDetail.evaluation.evaluatedAt")}</span>
                            <span className="detail-field__value">{formatDateTime(submission.evaluation.evaluatedAt)}</span>
                        </div>
                        <div className="detail-field detail-field--full">
                            <span className="detail-field__label">{t("student.submissionDetail.evaluation.details")}</span>
                            {submission.evaluation.details && submission.evaluation.details.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table mt-2">
                                        <thead>
                                            <tr>
                                                <th>{t("student.submissionDetail.evaluation.type")}</th>
                                                <th>{t("student.submissionDetail.evaluation.description")}</th>
                                                <th>{t("student.submissionDetail.evaluation.location")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submission.evaluation.details.map((detail, index) => (
                                                <tr key={detail.detailId ?? index}>
                                                    <td><span className="tag">{detail.errorType}</span></td>
                                                    <td>{detail.evaDescription}</td>
                                                    <td>{detail.errorLocation || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="detail-field__text">{t("student.submissionDetail.evaluation.noDetails")}</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="detail-field__text">{t("student.submissionDetail.evaluation.empty")}</p>
                )}

                {sortedRounds.length > 0 && (
                    <div className="round-history-list">
                        <div className="feedback-block-header">
                            <div>
                                <span className="detail-field__label">{t("student.submissionDetail.rounds.title")}</span>
                                <p className="detail-field__text">{t("student.submissionDetail.rounds.help")}</p>
                            </div>
                        </div>
                        {sortedRounds.map((round) => (
                            <details className="round-history-item" key={round.roundId}>
                                <summary>
                                    <span>{t("student.submissionDetail.rounds.roundWithMax", { round: round.roundNumber, max: maxRounds })}</span>
                                    <span className={`tag tag--${round.roundStatus.toLowerCase()}`}>
                                        {t(`student.submissionStatus.${round.roundStatus}`)}
                                    </span>
                                    <span>{round.overallScore ?? "-"} / 100</span>
                                </summary>
                                <div className="round-history-body">
                                    <div className="detail-field-grid">
                                        <div className="detail-field">
                                            <span className="detail-field__label">{t("student.submissionDetail.fields.submittedAt")}</span>
                                            <span className="detail-field__value">{formatDateTime(round.submittedAt)}</span>
                                        </div>
                                        <div className="detail-field">
                                            <span className="detail-field__label">{t("student.submissionDetail.rounds.gradedAt")}</span>
                                            <span className="detail-field__value">{formatDateTime(round.gradedAt)}</span>
                                        </div>
                                    </div>
                                    {round.details && round.details.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table">
                                                <tbody>
                                                    {round.details.map((detail, index) => (
                                                        <tr key={detail.detailId ?? `${round.roundId}-${index}`}>
                                                            <td><span className="tag">{detail.errorType}</span></td>
                                                            <td>{detail.evaDescription}</td>
                                                            <td>{detail.errorLocation || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="detail-field__text">{t("student.submissionDetail.rounds.noDetails")}</p>
                                    )}
                                </div>
                            </details>
                        ))}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentSubmissionDetailPage;
