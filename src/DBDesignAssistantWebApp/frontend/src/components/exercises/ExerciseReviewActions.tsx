import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";
import type { Exercise, ExerciseReviewRequest } from "../../types";
import {
    isStaffGeneratedAiExercise,
    readExerciseReviewMetadata,
} from "../../utils/exerciseReview";
import { ExercisePublishBadge, ExerciseReviewStatusBadge } from "./ExerciseStatusBadges";
import "./ExerciseAiReviewPanel.css";

type ExerciseReviewActionsProps = {
    exercise: Exercise;
    approveExercise: (exerciseId: number, payload: ExerciseReviewRequest) => Promise<Exercise>;
    rejectExercise: (exerciseId: number, payload: ExerciseReviewRequest) => Promise<Exercise>;
    onUpdated: (exercise: Exercise) => void;
};

const ExerciseReviewActions = ({
    exercise,
    approveExercise,
    rejectExercise,
    onUpdated,
}: ExerciseReviewActionsProps) => {
    const { t } = useTranslation();
    const [rejectReason, setRejectReason] = useState("");
    const [reviewing, setReviewing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    if (!isStaffGeneratedAiExercise(exercise)) {
        return null;
    }

    const metadata = readExerciseReviewMetadata(exercise.scenarioData);
    const reviewStatus = metadata.effectiveStatus;
    const canApprove = !exercise.isPublished && reviewStatus === "DRAFT";
    const canReject = !exercise.isPublished && reviewStatus === "DRAFT";

    const handleApprove = async () => {
        setReviewing(true);
        setError(null);
        setMessage(null);
        try {
            const updated = await approveExercise(exercise.exerciseId, { publish: false });
            onUpdated(updated);
            setMessage(t("admin.exercises.aiReview.messages.approved"));
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("admin.exercises.aiReview.errors.approve")));
        } finally {
            setReviewing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setError(t("admin.exercises.aiReview.errors.rejectReasonRequired"));
            return;
        }
        setReviewing(true);
        setError(null);
        setMessage(null);
        try {
            const updated = await rejectExercise(exercise.exerciseId, {
                reason: toOptional(rejectReason),
            });
            onUpdated(updated);
            setMessage(t("admin.exercises.aiReview.messages.rejected"));
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("admin.exercises.aiReview.errors.reject")));
        } finally {
            setReviewing(false);
        }
    };

    return (
        <div className="ai-review-detail-actions">
            <div className="ai-review-panel__badges">
                <ExerciseReviewStatusBadge exercise={exercise} />
                <ExercisePublishBadge exercise={exercise} />
            </div>
            {error ? <div className="alert">{error}</div> : null}
            {message ? <div className="alert alert-success">{message}</div> : null}
            {canReject ? (
                <div className="form-field">
                    <label htmlFor={`rejectReason-${exercise.exerciseId}`}>
                        {t("admin.exercises.aiReview.fields.rejectReason")}
                    </label>
                    <textarea
                        id={`rejectReason-${exercise.exerciseId}`}
                        className="textarea"
                        rows={2}
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder={t("admin.exercises.aiReview.placeholders.rejectReason")}
                        disabled={reviewing}
                    />
                </div>
            ) : null}
            {canApprove || canReject ? (
                <div className="ai-review-panel__actions">
                    {canApprove ? (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleApprove}
                            disabled={reviewing}
                        >
                            <CheckCircle size={16} aria-hidden="true" />
                            {t("admin.exercises.aiReview.actions.approve")}
                        </button>
                    ) : null}
                    {canReject ? (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleReject}
                            disabled={reviewing || !rejectReason.trim()}
                        >
                            <XCircle size={16} aria-hidden="true" />
                            {t("admin.exercises.aiReview.actions.reject")}
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="ai-review-note">
                    {t("admin.exercises.aiReview.actions.noReviewActions")}
                </div>
            )}
        </div>
    );
};

const toOptional = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const candidate = error as { response?: { data?: { message?: string } }; message?: string };
        return candidate.response?.data?.message || candidate.message || fallback;
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};

export default ExerciseReviewActions;
