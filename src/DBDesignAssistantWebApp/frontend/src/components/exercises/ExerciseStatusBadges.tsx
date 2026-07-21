import { useTranslation } from "react-i18next";
import type { Exercise } from "../../types";
import {
    getExerciseCategory,
    getExerciseReviewStatusTagClass,
    isStaffGeneratedAiExercise,
    readExerciseReviewMetadata,
} from "../../utils/exerciseReview";

type ExerciseBadgeProps = {
    exercise: Exercise;
};

export const ExerciseSourceBadge = ({ exercise }: ExerciseBadgeProps) => {
    const { t } = useTranslation();
    const category = getExerciseCategory(exercise);

    return (
        <span className={`tag ${category !== "MANUAL" ? "tag--ai" : ""}`}>
            {t(`admin.exercises.sources.${category.toLowerCase()}`, { defaultValue: category })}
        </span>
    );
};

export const ExerciseReviewStatusBadge = ({ exercise }: ExerciseBadgeProps) => {
    const { t } = useTranslation();
    if (!isStaffGeneratedAiExercise(exercise)) {
        return null;
    }

    const metadata = readExerciseReviewMetadata(exercise.scenarioData);
    return (
        <span className={`tag ${getExerciseReviewStatusTagClass(metadata.effectiveStatus)}`}>
            {t(`admin.exercises.aiReview.status.${metadata.effectiveStatus.toLowerCase()}`, {
                defaultValue: metadata.effectiveStatus,
            })}
        </span>
    );
};

export const ExercisePublishBadge = ({ exercise }: ExerciseBadgeProps) => {
    const { t } = useTranslation();
    if (isStaffGeneratedAiExercise(exercise)) {
        return (
            <span className="tag tag--draft">
                {t("admin.exercises.publishStatus.notApplicable", {
                    defaultValue: "Not published to students",
                })}
            </span>
        );
    }

    return (
        <span className={`tag ${exercise.isPublished ? "tag--published" : ""}`}>
            {exercise.isPublished
                ? t("admin.exercises.publishStatus.published", { defaultValue: "Published" })
                : t("admin.exercises.publishStatus.unpublished", { defaultValue: "Unpublished" })}
        </span>
    );
};
