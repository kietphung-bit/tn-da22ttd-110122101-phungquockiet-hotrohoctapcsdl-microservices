import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Exercise } from "../../types";
import {
    isStaffGeneratedAiExercise,
    readExerciseReviewMetadata,
} from "../../utils/exerciseReview";
import { ExercisePublishBadge, ExerciseReviewStatusBadge } from "./ExerciseStatusBadges";
import "./ExerciseAiReviewPanel.css";

type ExerciseReviewSummaryProps = {
    exercise: Exercise;
};

const formatDateLike = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const ExerciseReviewSummary = ({ exercise }: ExerciseReviewSummaryProps) => {
    const { t } = useTranslation();
    const metadata = useMemo(
        () => readExerciseReviewMetadata(exercise.scenarioData),
        [exercise.scenarioData],
    );

    if (!isStaffGeneratedAiExercise(exercise)) {
        return null;
    }

    const rows = [
        {
            key: "creator",
            label: t("admin.exercises.aiReview.detail.creator"),
            value: exercise.createdBy
                ? `${exercise.createdBy.fullName} (${exercise.createdBy.userEmail})`
                : "",
        },
        {
            key: "reviewPurpose",
            label: t("admin.exercises.aiReview.detail.reviewPurpose"),
            value: metadata.reviewPurpose,
        },
        {
            key: "reviewSource",
            label: t("admin.exercises.aiReview.detail.reviewSource"),
            value: metadata.reviewSource,
        },
        {
            key: "reviewCreatedAt",
            label: t("admin.exercises.aiReview.detail.reviewCreatedAt"),
            value: formatDateLike(metadata.reviewCreatedAt),
        },
        {
            key: "reviewedAt",
            label: t("admin.exercises.aiReview.detail.reviewedAt"),
            value: formatDateLike(metadata.reviewedAt),
        },
        {
            key: "reviewedByRole",
            label: t("admin.exercises.aiReview.detail.reviewedByRole"),
            value: metadata.reviewedByRole,
        },
        {
            key: "baseExercise",
            label: t("admin.exercises.aiReview.detail.baseExercise"),
            value: metadata.baseExerciseCode || metadata.baseExerciseId,
        },
        {
            key: "approvedForGeneration",
            label: t("admin.exercises.aiReview.detail.approvedForGeneration"),
            value: metadata.approvedForGeneration
                ? t("admin.exercises.yes")
                : "",
        },
        {
            key: "revisionOfExerciseId",
            label: t("admin.exercises.aiReview.detail.revisionOfExercise"),
            value: metadata.revisionOfExerciseId,
        },
        {
            key: "rejectReason",
            label: t("admin.exercises.aiReview.detail.rejectReason"),
            value: metadata.rejectReason,
            full: true,
        },
    ].filter((row) => row.value);

    const needsApprovalWarning = metadata.effectiveStatus !== "APPROVED" && !exercise.isPublished;

    return (
        <div className="ai-review-summary">
            <div className="ai-review-panel__badges">
                <ExerciseReviewStatusBadge exercise={exercise} />
                <ExercisePublishBadge exercise={exercise} />
            </div>
            {needsApprovalWarning ? (
                <div className="ai-review-warning">
                    {t("admin.exercises.aiReview.detail.publishGuard")}
                </div>
            ) : null}
            {metadata.effectiveStatus === "APPROVED" ? (
                <div className="ai-review-note">
                    {t("admin.exercises.aiReview.detail.approvedTrial")}
                </div>
            ) : null}
            {rows.length > 0 ? (
                <dl className="ai-review-summary__grid">
                    {rows.map((row) => (
                        <div
                            key={row.key}
                            className={row.full ? "ai-review-summary__item--full" : undefined}
                        >
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </div>
    );
};

export default ExerciseReviewSummary;
