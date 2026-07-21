import type { Exercise, ExerciseReviewStatus } from "../types";

const REVIEW_STATUSES: ExerciseReviewStatus[] = ["DRAFT", "APPROVED", "REJECTED"];
const AI_GENERATION_TRIAL_PURPOSE = "AI_GENERATION_TRIAL";

export type ExerciseCategory = "MANUAL" | "STAFF_AI_TRIAL" | "STUDENT_PRIVATE_AI";

export type ExerciseReviewMetadata = {
    status: ExerciseReviewStatus | null;
    effectiveStatus: ExerciseReviewStatus;
    reviewPurpose: string;
    reviewSource: string;
    reviewCreatedAt: string;
    reviewedAt: string;
    reviewedByRole: string;
    rejectReason: string;
    baseExerciseId: string;
    baseExerciseCode: string;
    approvedForGeneration: boolean;
    revisionOfExerciseId: string;
};

export type AiGenerationPolicyMetadata = {
    enabled: boolean;
    approvedTrialExerciseId: string;
    approvedAt: string;
    approvedByRole: string;
    notes: string;
};

const readStringField = (
    scenarioData: Record<string, unknown> | null | undefined,
    key: string,
) => {
    const value = scenarioData?.[key];
    if (typeof value === "string") {
        return value.trim();
    }
    if (typeof value === "number") {
        return String(value);
    }
    return "";
};

const readBooleanField = (
    scenarioData: Record<string, unknown> | null | undefined,
    key: string,
) => scenarioData?.[key] === true;

const readObjectField = (
    scenarioData: Record<string, unknown> | null | undefined,
    key: string,
): Record<string, unknown> | null => {
    const value = scenarioData?.[key];
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
};

export const readExerciseReviewStatus = (
    scenarioData: Record<string, unknown> | null | undefined,
): ExerciseReviewStatus | null => {
    const rawStatus = scenarioData?.reviewStatus;
    if (typeof rawStatus !== "string") {
        return null;
    }
    const normalized = rawStatus.trim().toUpperCase();
    return REVIEW_STATUSES.includes(normalized as ExerciseReviewStatus)
        ? (normalized as ExerciseReviewStatus)
        : null;
};

export const readExerciseReviewMetadata = (
    scenarioData: Record<string, unknown> | null | undefined,
): ExerciseReviewMetadata => {
    const status = readExerciseReviewStatus(scenarioData);
    return {
        status,
        effectiveStatus: status ?? "DRAFT",
        reviewPurpose: readStringField(scenarioData, "reviewPurpose"),
        reviewSource: readStringField(scenarioData, "reviewSource"),
        reviewCreatedAt: readStringField(scenarioData, "reviewCreatedAt"),
        reviewedAt: readStringField(scenarioData, "reviewedAt"),
        reviewedByRole: readStringField(scenarioData, "reviewedByRole"),
        rejectReason: readStringField(scenarioData, "rejectReason"),
        baseExerciseId: readStringField(scenarioData, "baseExerciseId"),
        baseExerciseCode: readStringField(scenarioData, "baseExerciseCode"),
        approvedForGeneration: readBooleanField(scenarioData, "approvedForGeneration"),
        revisionOfExerciseId: readStringField(scenarioData, "revisionOfExerciseId"),
    };
};

export const isStaffGeneratedAiExercise = (exercise: Exercise) =>
    exercise.exerciseSource === "AI_GENERATED" && !exercise.ownerStudent;

export const isAiGenerationTrial = (exercise: Exercise) =>
    isStaffGeneratedAiExercise(exercise)
    && (
        readExerciseReviewMetadata(exercise.scenarioData).reviewPurpose === AI_GENERATION_TRIAL_PURPOSE
        || Boolean(readExerciseReviewStatus(exercise.scenarioData))
        || !exercise.ownerStudent
    );

export const isStudentPrivateAiExercise = (exercise: Exercise) =>
    exercise.exerciseSource === "AI_GENERATED" && Boolean(exercise.ownerStudent);

export const getExerciseCategory = (exercise: Exercise): ExerciseCategory => {
    if (isStudentPrivateAiExercise(exercise)) {
        return "STUDENT_PRIVATE_AI";
    }
    if (isStaffGeneratedAiExercise(exercise)) {
        return "STAFF_AI_TRIAL";
    }
    return "MANUAL";
};

export const readAiGenerationPolicy = (
    scenarioData: Record<string, unknown> | null | undefined,
): AiGenerationPolicyMetadata => {
    const policy = readObjectField(scenarioData, "aiGenerationPolicy");
    return {
        enabled: policy?.enabled === true,
        approvedTrialExerciseId: readStringField(policy, "approvedTrialExerciseId"),
        approvedAt: readStringField(policy, "approvedAt"),
        approvedByRole: readStringField(policy, "approvedByRole"),
        notes: readStringField(policy, "notes"),
    };
};

export const isReviewableAiDraft = (exercise: Exercise) =>
    isStaffGeneratedAiExercise(exercise)
    && readExerciseReviewStatus(exercise.scenarioData) !== "APPROVED";

export const getExerciseReviewStatusTagClass = (status: ExerciseReviewStatus) => {
    if (status === "APPROVED") return "tag--published";
    if (status === "REJECTED") return "tag--failed";
    return "tag--draft";
};
