import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import StudentLayout from "../../components/layouts/StudentLayout";
import ScenarioViewer from "../../components/viewers/ScenarioViewer";
import { ErdWorkspaceEditor, normalizeDiagramData, touchDiagramData } from "../../features/erd-workspace";
import type { ErdDiagramData } from "../../features/erd-workspace";
import { useAuth } from "../../hooks/useAuth";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { AIEvaluation, EvaluationRound, Exercise, Submission } from "../../types";

const POLLING_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 45;

const sortRounds = (rounds: EvaluationRound[] | null | undefined) => {
    return [...(rounds ?? [])].sort((a, b) => a.roundNumber - b.roundNumber);
};

const formatDateTime = (value: string | null | undefined) => {
    return value ? new Date(value).toLocaleString() : "-";
};

const StudentWorkspacePage = () => {
    const { t } = useTranslation();
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [diagramData, setDiagramData] = useState<ErdDiagramData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reopening, setReopening] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loadWarning, setLoadWarning] = useState<string | null>(null);
    const [evaluation, setEvaluation] = useState<AIEvaluation | null>(null);
    const [pollingAttempts, setPollingAttempts] = useState(0);

    useEffect(() => {
        let isCancelled = false;

        const fetchWorkspace = async () => {
            if (!submissionId) {
                setErrorMsg(t("student.workspacePage.errors.missingSubmissionId"));
                setLoading(false);
                return;
            }

            try {
                const id = Number(submissionId);
                if (!Number.isFinite(id)) {
                    throw new Error(t("student.workspacePage.errors.invalidSubmissionId"));
                }

                const submissionData = await studentSubmissionApi.getById(id);
                if (isCancelled) return;

                const parsed = normalizeDiagramData(submissionData.diagramData);
                setSubmission(submissionData);
                setEvaluation(submissionData.evaluation ?? null);
                setDiagramData(parsed.data);
                setLoadWarning(parsed.ok ? parsed.warning ?? null : ("error" in parsed ? parsed.error : null));

                try {
                    const exerciseData = await studentExerciseApi.getById(submissionData.exerciseId);
                    if (!isCancelled) setExercise(exerciseData);
                } catch {
                    if (!isCancelled) setExercise(null);
                }
            } catch (error) {
                if (!isCancelled) {
                    const message = error instanceof Error ? error.message : String(error);
                    setErrorMsg(t("student.workspacePage.errors.loadWorkspace", { message }));
                }
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        fetchWorkspace();

        return () => {
            isCancelled = true;
        };
    }, [submissionId, t]);

    const currentDiagramData = useMemo(() => {
        if (!diagramData) return null;
        return touchDiagramData(diagramData);
    }, [diagramData]);

    const canEdit = submission?.submissionStatus === "DRAFT";
    const maxRounds = submission?.maxRounds ?? evaluation?.maxRounds ?? 3;
    const roundsUsed = submission?.roundsUsed ?? evaluation?.roundsUsed ?? 0;
    const evaluationRounds = useMemo(() => sortRounds(submission?.evaluationRounds), [submission?.evaluationRounds]);
    const latestRound = evaluationRounds.length > 0 ? evaluationRounds[evaluationRounds.length - 1] : null;
    const latestGradedRound = useMemo(
        () => [...evaluationRounds].reverse().find((round) => round.roundStatus === "GRADED") ?? null,
        [evaluationRounds]
    );
    const currentRound = submission?.currentRound ?? latestRound?.roundNumber ?? evaluation?.roundNumber ?? roundsUsed;
    const currentRoundStatus = submission?.submissionStatus === "DRAFT"
        ? "DRAFT"
        : latestRound?.roundStatus ?? submission?.submissionStatus ?? "DRAFT";
    const latestFeedbackRoundNumber = evaluation?.roundNumber ?? latestGradedRound?.roundNumber ?? null;
    const latestFeedbackScore = evaluation?.overallScore ?? latestGradedRound?.overallScore ?? null;
    const latestFeedbackEvaluatedAt = evaluation?.evaluatedAt ?? latestGradedRound?.gradedAt ?? null;
    const latestFeedbackDetails = evaluation?.details ?? latestGradedRound?.details ?? null;
    const latestFeedbackProvider = evaluation?.provider ?? latestGradedRound?.provider ?? null;
    const latestFeedbackModel = evaluation?.model ?? latestGradedRound?.model ?? null;
    const latestFeedbackFallbackUsed = evaluation?.fallbackUsed ?? latestGradedRound?.fallbackUsed ?? false;
    const latestFeedbackFallbackFrom = evaluation?.fallbackFrom ?? latestGradedRound?.fallbackFrom ?? null;
    const canRequestRevision = Boolean(
        submission
        && submission.canResubmit
        && roundsUsed < maxRounds
        && (submission.submissionStatus === "GRADED" || submission.submissionStatus === "FAILED")
    );
    const roundsExhausted = roundsUsed >= maxRounds;
    const nextRound = Math.min(roundsUsed + 1, maxRounds);
    const hasScenarioData = Boolean(exercise?.scenarioData && Object.keys(exercise.scenarioData).length > 0);
    const pollingTimedOut = pollingAttempts >= MAX_POLL_ATTEMPTS;
    const formatProviderLabel = useCallback((
        provider: string | null | undefined,
        fallbackUsed: boolean | null | undefined,
        fallbackFrom: string | null | undefined
    ) => {
        if (!provider) {
            return t("student.workspacePage.evaluation.providerUnknown");
        }
        if (fallbackUsed && fallbackFrom) {
            return t("student.workspacePage.evaluation.providerFallbackLabel", {
                provider,
                fallbackFrom,
            });
        }
        return t("student.workspacePage.evaluation.providerLabel", {
            provider,
        });
    }, [t]);
    const latestFeedbackProviderLabel = formatProviderLabel(
        latestFeedbackProvider,
        latestFeedbackFallbackUsed,
        latestFeedbackFallbackFrom
    );
    const shouldPollEvaluation = Boolean(
        submission
        && !pollingTimedOut
        && (
            submission.submissionStatus === "SUBMITTED"
            || submission.submissionStatus === "PROCESSING"
            || latestRound?.roundStatus === "PROCESSING"
        )
    );

    const pollSubmissionStatus = useCallback(async () => {
        if (!submission) return;

        const status = await studentSubmissionApi.getStatus(submission.submissionId);
        let nextEvaluation: AIEvaluation | null = null;
        let refreshedSubmission: Submission | null = null;
        const terminalStatus = status.submissionStatus === "GRADED" || status.submissionStatus === "FAILED";
        if (status.evaluationReady || terminalStatus) {
            refreshedSubmission = await studentSubmissionApi.getById(submission.submissionId);
        }
        if (status.evaluationReady || status.submissionStatus === "GRADED") {
            nextEvaluation = await studentSubmissionApi.getEvaluation(submission.submissionId);
        } else {
            nextEvaluation = refreshedSubmission?.evaluation ?? evaluation;
        }

        setSubmission((current) => current
            ? {
                ...current,
                ...(refreshedSubmission ?? {}),
                submissionStatus: status.submissionStatus,
                submittedAt: status.submittedAt,
                currentRound: status.currentRound ?? current.currentRound,
                roundsUsed: status.roundsUsed ?? current.roundsUsed,
                maxRounds: status.maxRounds ?? current.maxRounds,
                canResubmit: status.canResubmit ?? current.canResubmit,
                evaluation: nextEvaluation ?? refreshedSubmission?.evaluation ?? current.evaluation,
            }
            : current
        );

        if (nextEvaluation) {
            setEvaluation(nextEvaluation);
            setPollingAttempts(0);
        }
    }, [evaluation, submission]);

    useEffect(() => {
        if (!shouldPollEvaluation) {
            return;
        }

        const timerId = window.setTimeout(() => {
            pollSubmissionStatus()
                .catch((error: unknown) => {
                    const err = error as { response?: { data?: { message?: string } }, message?: string };
                    setErrorMsg(err.response?.data?.message || err.message || t("student.workspacePage.errors.polling"));
                })
                .finally(() => setPollingAttempts((attempt) => attempt + 1));
        }, POLLING_INTERVAL_MS);

        return () => window.clearTimeout(timerId);
    }, [pollSubmissionStatus, pollingAttempts, shouldPollEvaluation, t]);

    const handleSaveDraft = async () => {
        if (!submission || !currentDiagramData || !canEdit) return;
        setErrorMsg("");
        setSuccessMsg("");
        setSaving(true);
        try {
            const updated = await studentSubmissionApi.updateDraft(submission.submissionId, {
                diagramData: currentDiagramData,
            });
            setSubmission(updated);
            setDiagramData(currentDiagramData);
            setSuccessMsg(t("student.workspacePage.messages.saveSuccess"));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }, message?: string };
            setErrorMsg(err.response?.data?.message || err.message || t("student.workspacePage.errors.saveDraft"));
        } finally {
            setSaving(false);
        }
    };

    const handleEditAgain = async () => {
        if (!submission || !currentDiagramData || !canRequestRevision) return;
        setErrorMsg("");
        setSuccessMsg("");
        setReopening(true);
        try {
            const updated = await studentSubmissionApi.updateDraft(submission.submissionId, {
                diagramData: currentDiagramData,
            });
            setSubmission({
                ...updated,
                evaluation: submission.evaluation,
                evaluationRounds: submission.evaluationRounds,
            });
            setDiagramData(currentDiagramData);
            setEvaluation(submission.evaluation ?? evaluation);
            setPollingAttempts(0);
            setSuccessMsg(t("student.workspacePage.messages.reopenSuccess"));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }, message?: string };
            setErrorMsg(err.response?.data?.message || err.message || t("student.workspacePage.errors.reopen"));
        } finally {
            setReopening(false);
        }
    };

    const handleSubmit = async () => {
        if (!submission || !currentDiagramData || !canEdit) return;
        if (!window.confirm(t("student.workspacePage.confirmSubmit"))) return;

        setErrorMsg("");
        setSuccessMsg("");
        setSubmitting(true);
        try {
            const submitted = await studentSubmissionApi.submit(submission.submissionId, {
                diagramData: currentDiagramData,
            });
            const status = await studentSubmissionApi.getStatus(submission.submissionId);
            let nextEvaluation: AIEvaluation | null = null;
            const refreshedSubmission: Submission | null = await studentSubmissionApi.getById(submission.submissionId);
            if (status.evaluationReady) {
                nextEvaluation = await studentSubmissionApi.getEvaluation(submission.submissionId);
            } else {
                nextEvaluation = refreshedSubmission.evaluation ?? null;
            }
            setSubmission({
                ...submitted,
                ...(refreshedSubmission ?? {}),
                evaluationRounds: refreshedSubmission?.evaluationRounds ?? submitted.evaluationRounds ?? submission.evaluationRounds,
                submissionStatus: status.submissionStatus,
                submittedAt: status.submittedAt,
                currentRound: status.currentRound ?? submitted.currentRound,
                roundsUsed: status.roundsUsed ?? submitted.roundsUsed,
                maxRounds: status.maxRounds ?? submitted.maxRounds,
                canResubmit: status.canResubmit ?? submitted.canResubmit,
                evaluation: nextEvaluation,
            });
            setEvaluation(nextEvaluation);
            setDiagramData(currentDiagramData);
            setPollingAttempts(0);
            setSuccessMsg(t("student.workspacePage.messages.submitSuccess"));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }, message?: string };
            setErrorMsg(err.response?.data?.message || err.message || t("student.workspacePage.errors.submit"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    if (loading) {
        return (
            <StudentLayout title={t("student.workspacePage.loadingTitle")} onSignOut={handleSignOut}>
                <div className="loading-text">{t("student.workspacePage.loading")}</div>
            </StudentLayout>
        );
    }

    if (!submission || !diagramData) {
        return (
            <StudentLayout title={t("student.workspacePage.notFoundTitle")} onSignOut={handleSignOut}>
                {errorMsg ? <div className="alert">{errorMsg}</div> : <div>{t("student.workspacePage.notFound")}</div>}
            </StudentLayout>
        );
    }

    return (
        <StudentLayout title={t("student.workspacePage.title", { title: submission.exerciseTitle })} onSignOut={handleSignOut}>
            <div className="page-header">
                <div>
                    <h2>{t("student.workspacePage.title", { title: submission.exerciseTitle })}</h2>
                    <div className="tags-list">
                        <span className={`tag tag--${submission.submissionStatus.toLowerCase()}`}>
                            {submission.submissionStatus}
                        </span>
                        {submission.exerciseCode && <span className="tag">{submission.exerciseCode}</span>}
                        <span className="tag">
                            {t("student.workspacePage.rounds.counter", { used: roundsUsed, max: maxRounds })}
                        </span>
                    </div>
                </div>
                <div className="action-group">
                    <button className="btn btn-outline" onClick={() => navigate("/student/exercise-generator")} type="button">
                        {t("student.workspacePage.exit")}
                    </button>
                    {canEdit ? (
                        <>
                            <button className="btn btn-primary" onClick={handleSaveDraft} disabled={saving || reopening || submitting} type="button">
                                {saving ? t("student.workspacePage.saving") : t("student.workspacePage.saveDraft")}
                            </button>
                            <button className="btn btn-success" onClick={handleSubmit} disabled={saving || reopening || submitting} type="button">
                                {submitting ? t("student.workspacePage.submitting") : t("student.workspacePage.submit")}
                            </button>
                        </>
                    ) : canRequestRevision ? (
                        <button className="btn btn-primary" onClick={handleEditAgain} disabled={saving || reopening || submitting} type="button">
                            {reopening ? t("student.workspacePage.reopening") : t("student.workspacePage.editAgain")}
                        </button>
                    ) : null}
                </div>
            </div>

            {errorMsg && <div className="alert">{errorMsg}</div>}
            {successMsg && <div className="alert alert--success">{successMsg}</div>}
            {loadWarning && <div className="info-notice">{loadWarning}</div>}
            {!canEdit && (
                <div
                    className={canRequestRevision ? "info-notice" : "alert"}
                    style={canRequestRevision ? { alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" } : undefined}
                >
                    <p className="detail-field__text" style={{ margin: 0 }}>
                        {canRequestRevision
                            ? t("student.workspacePage.revisionAvailable", { nextRound, max: maxRounds })
                            : roundsExhausted
                                ? t("student.workspacePage.rounds.exhausted")
                                : t("student.workspacePage.readOnly")}
                    </p>
                    {canRequestRevision && (
                        <button className="btn btn-primary" onClick={handleEditAgain} disabled={saving || reopening || submitting} type="button">
                            {reopening ? t("student.workspacePage.reopening") : t("student.workspacePage.editAgain")}
                        </button>
                    )}
                </div>
            )}

            <section className="section-card" style={{ marginBottom: 16 }}>
                <div className="detail-field-grid">
                    <div className="detail-field detail-field--full">
                        <span className="detail-field__label">{t("student.workspacePage.fields.exercise")}</span>
                        <span className="detail-field__value">{exercise?.exTitle ?? submission.exerciseTitle}</span>
                    </div>
                    <div className="detail-field detail-field--full">
                        <span className="detail-field__label">{t("student.workspacePage.fields.description")}</span>
                        <p className="detail-field__text">{exercise?.exDescription || t("student.workspacePage.noDescription")}</p>
                    </div>
                </div>
                {hasScenarioData && (
                    <ScenarioViewer
                        data={exercise?.scenarioData}
                        showSummary={false}
                        showTechnicalData={false}
                        showExtraFields={false}
                        showEmptySections={false}
                    />
                )}
            </section>

            <section className="section-card">
                <ErdWorkspaceEditor
                    key={`${submission.submissionId}-${canEdit ? "editable" : "locked"}`}
                    initialData={diagramData}
                    isLocked={!canEdit}
                    onChange={setDiagramData}
                    edgeLabelMode="endpoint-cardinality"
                    relationshipCardinalityMode="per-end"
                />
            </section>

            {(submission.submissionStatus === "PROCESSING"
                || submission.submissionStatus === "GRADED"
                || submission.submissionStatus === "FAILED"
                || evaluation
                || evaluationRounds.length > 0) && (
                <section className="section-card workspace-feedback-panel" style={{ marginTop: 16 }}>
                    <div className="detail-field-grid workspace-feedback-summary">
                        <div className="detail-field">
                            <span className="detail-field__label">{t("student.workspacePage.rounds.current")}</span>
                            <span className="detail-field__value">
                                {currentRound ? `${currentRound} / ${maxRounds}` : `0 / ${maxRounds}`}
                            </span>
                        </div>
                        <div className="detail-field">
                            <span className="detail-field__label">{t("student.workspacePage.rounds.currentStatus")}</span>
                            <span className={`tag tag--${currentRoundStatus.toLowerCase()}`}>
                                {currentRoundStatus}
                            </span>
                        </div>
                        <div className="detail-field">
                            <span className="detail-field__label">{t("student.workspacePage.evaluation.status")}</span>
                            <span className={`tag tag--${submission.submissionStatus.toLowerCase()}`}>
                                {submission.submissionStatus}
                            </span>
                        </div>
                    </div>

                    {(currentRoundStatus === "PROCESSING" || shouldPollEvaluation) && (
                        <div className="info-notice workspace-feedback-notice">
                            <p className="detail-field__text">
                                {pollingTimedOut
                                    ? t("student.workspacePage.evaluation.pollTimeout")
                                    : latestFeedbackRoundNumber
                                        ? t("student.workspacePage.evaluation.processingWithPrevious")
                                        : t("student.workspacePage.evaluation.processing")}
                            </p>
                            {shouldPollEvaluation && !pollingTimedOut && (
                                <p className="detail-field__text">
                                    {t("student.workspacePage.evaluation.polling", { seconds: 4 })}
                                </p>
                            )}
                        </div>
                    )}

                    {currentRoundStatus === "FAILED" && (
                        <div className="alert workspace-feedback-notice">
                            <p className="detail-field__text">
                                {canRequestRevision
                                    ? t("student.workspacePage.evaluation.failedCanRevise")
                                    : t("student.workspacePage.evaluation.failedNoRounds")}
                            </p>
                        </div>
                    )}

                    {latestFeedbackRoundNumber ? (
                        <div className="feedback-latest-block">
                            <div className="feedback-block-header">
                                <div>
                                    <span className="detail-field__label">{t("student.workspacePage.rounds.latestFeedback")}</span>
                                    <h3>
                                        {t("student.workspacePage.rounds.roundWithMax", {
                                            round: latestFeedbackRoundNumber,
                                            max: maxRounds,
                                        })}
                                    </h3>
                                </div>
                                <span className="tag tag--graded">GRADED</span>
                            </div>
                            <div className="detail-field-grid">
                                <div className="detail-field">
                                    <span className="detail-field__label">{t("student.workspacePage.evaluation.title")}</span>
                                    <span className="detail-field__value">{latestFeedbackProviderLabel}</span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">{t("student.workspacePage.evaluation.model")}</span>
                                    <span className="detail-field__value">{latestFeedbackModel ?? "-"}</span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">{t("student.workspacePage.evaluation.score")}</span>
                                    <span className="detail-field__value">{latestFeedbackScore ?? "-"} / 100</span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">{t("student.workspacePage.evaluation.evaluatedAt")}</span>
                                    <span className="detail-field__value">{formatDateTime(latestFeedbackEvaluatedAt)}</span>
                                </div>
                                <div className="detail-field detail-field--full">
                                    <span className="detail-field__label">{t("student.workspacePage.evaluation.details")}</span>
                                    {latestFeedbackDetails && latestFeedbackDetails.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>{t("student.workspacePage.evaluation.type")}</th>
                                                        <th>{t("student.workspacePage.evaluation.description")}</th>
                                                        <th>{t("student.workspacePage.evaluation.location")}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {latestFeedbackDetails.map((detail, index) => (
                                                        <tr key={detail.detailId ?? `${detail.errorType}-${index}`}>
                                                            <td><span className="tag">{detail.errorType}</span></td>
                                                            <td>{detail.evaDescription}</td>
                                                            <td>{detail.errorLocation || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="detail-field__text">{t("student.workspacePage.evaluation.noDetails")}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="detail-field__text workspace-feedback-empty">
                            {t("student.workspacePage.evaluation.noGradedFeedback")}
                        </p>
                    )}

                    {evaluationRounds.length > 0 && (
                        <div className="round-history-list">
                            <div className="feedback-block-header">
                                <div>
                                    <span className="detail-field__label">{t("student.workspacePage.rounds.history")}</span>
                                    <p className="detail-field__text">{t("student.workspacePage.rounds.historyHelp")}</p>
                                </div>
                            </div>
                            {evaluationRounds.map((round) => (
                                <details
                                    className="round-history-item"
                                    key={round.roundId}
                                    open={round.roundStatus !== "GRADED" && round.roundNumber === currentRound}
                                >
                                    <summary>
                                        <span>{t("student.workspacePage.rounds.roundWithMax", { round: round.roundNumber, max: maxRounds })}</span>
                                        <span className={`tag tag--${round.roundStatus.toLowerCase()}`}>{round.roundStatus}</span>
                                        <span>{round.overallScore ?? "-"} / 100</span>
                                    </summary>
                                    <div className="round-history-body">
                                        <div className="detail-field-grid">
                                            <div className="detail-field">
                                                <span className="detail-field__label">{t("student.workspacePage.evaluation.title")}</span>
                                                <span className="detail-field__value">
                                                    {formatProviderLabel(round.provider, round.fallbackUsed, round.fallbackFrom)}
                                                </span>
                                            </div>
                                            <div className="detail-field">
                                                <span className="detail-field__label">{t("student.workspacePage.evaluation.model")}</span>
                                                <span className="detail-field__value">{round.model ?? "-"}</span>
                                            </div>
                                            <div className="detail-field">
                                                <span className="detail-field__label">{t("student.workspacePage.rounds.submittedAt")}</span>
                                                <span className="detail-field__value">{formatDateTime(round.submittedAt)}</span>
                                            </div>
                                            <div className="detail-field">
                                                <span className="detail-field__label">{t("student.workspacePage.rounds.gradedAt")}</span>
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
                                            <p className="detail-field__text">{t("student.workspacePage.rounds.noRoundDetails")}</p>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </StudentLayout>
    );
};

export default StudentWorkspacePage;
