import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Plus, XCircle } from "lucide-react";
import ScenarioViewer from "../viewers/ScenarioViewer";
import type {
    Exercise,
    ExerciseGenerationRequest,
    ExerciseGenerationResponse,
    ExerciseReviewRequest,
} from "../../types";
import {
    getExerciseReviewStatusTagClass,
    readAiGenerationPolicy,
    readExerciseReviewMetadata,
} from "../../utils/exerciseReview";
import { ExercisePublishBadge } from "./ExerciseStatusBadges";
import "./ExerciseAiReviewPanel.css";

type ExerciseAiReviewPanelProps = {
    loadBaseExercises: () => Promise<Exercise[]>;
    generateExercise: (payload: ExerciseGenerationRequest) => Promise<ExerciseGenerationResponse>;
    approveExercise: (exerciseId: number, payload: ExerciseReviewRequest) => Promise<Exercise>;
    rejectExercise: (exerciseId: number, payload: ExerciseReviewRequest) => Promise<Exercise>;
    onExerciseChanged: () => void;
    fixedBaseExerciseId?: number;
    fixedBaseExercise?: Exercise;
};

type GeneratorForm = {
    baseExerciseId: string;
    customPrompt: string;
    businessContext: string;
    difficulty: string;
    businessDomain: string;
    additionalRequirements: string;
};

const initialForm: GeneratorForm = {
    baseExerciseId: "",
    customPrompt: "",
    businessContext: "",
    difficulty: "MEDIUM",
    businessDomain: "",
    additionalRequirements: "",
};

const difficultyValues = ["EASY", "MEDIUM", "HARD"];

const ExerciseAiReviewPanel = ({
    loadBaseExercises,
    generateExercise,
    approveExercise,
    rejectExercise,
    onExerciseChanged,
    fixedBaseExerciseId,
    fixedBaseExercise,
}: ExerciseAiReviewPanelProps) => {
    const { t } = useTranslation();
    const [form, setForm] = useState<GeneratorForm>(() => ({
        ...initialForm,
        baseExerciseId: fixedBaseExerciseId ? String(fixedBaseExerciseId) : "",
    }));
    const [baseExercises, setBaseExercises] = useState<Exercise[]>(() =>
        fixedBaseExercise ? [fixedBaseExercise] : [],
    );
    const [loadingBases, setLoadingBases] = useState(!fixedBaseExercise);
    const [generating, setGenerating] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [preview, setPreview] = useState<ExerciseGenerationResponse | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const loadOptions = async () => {
            if (fixedBaseExercise) {
                return;
            }
            try {
                const exercises = await loadBaseExercises();
                if (!isCancelled) {
                    setBaseExercises(
                        exercises.filter(
                            (exercise) => exercise.exerciseSource !== "AI_GENERATED" && exercise.isPublished,
                        ),
                    );
                }
            } catch {
                if (!isCancelled) {
                    setBaseExercises([]);
                }
            } finally {
                if (!isCancelled) {
                    setLoadingBases(false);
                }
            }
        };

        loadOptions();
        return () => {
            isCancelled = true;
        };
    }, [fixedBaseExercise, loadBaseExercises]);

    const selectedBaseExercise = useMemo(() => {
        if (fixedBaseExercise) {
            return fixedBaseExercise;
        }
        const id = Number(form.baseExerciseId);
        if (!Number.isFinite(id)) {
            return null;
        }
        return baseExercises.find((exercise) => exercise.exerciseId === id) ?? null;
    }, [baseExercises, fixedBaseExercise, form.baseExerciseId]);

    const selectedBasePolicy = useMemo(
        () => readAiGenerationPolicy(selectedBaseExercise?.scenarioData),
        [selectedBaseExercise?.scenarioData],
    );

    const reviewMetadata = readExerciseReviewMetadata(preview?.scenarioData);
    const reviewStatus = reviewMetadata.effectiveStatus;
    const isPreviewPublished = Boolean(preview?.isPublished);
    const canApprovePreview = Boolean(preview) && !isPreviewPublished && reviewStatus === "DRAFT";
    const canRejectPreview = Boolean(preview) && !isPreviewPublished && reviewStatus === "DRAFT";

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const buildPayload = (): ExerciseGenerationRequest => {
        const baseExerciseId = fixedBaseExerciseId
            ?? (form.baseExerciseId ? Number(form.baseExerciseId) : null);
        return {
            baseExerciseId,
            customPrompt: toOptional(form.customPrompt),
            businessContext: toOptional(form.businessContext),
            difficulty: form.difficulty,
            businessDomain: toOptional(form.businessDomain),
            additionalRequirements: toOptional(form.additionalRequirements),
        };
    };

    const validateGenerationInput = () => {
        const hasBaseExercise = Boolean(form.baseExerciseId);
        const hasPrompt = Boolean(
            form.customPrompt.trim()
            || form.businessContext.trim()
            || form.businessDomain.trim()
            || form.additionalRequirements.trim(),
        );
        if (!hasBaseExercise && !hasPrompt) {
            setError(t("admin.exercises.aiReview.errors.inputRequired"));
            return false;
        }
        return true;
    };

    const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        if (!validateGenerationInput()) {
            return;
        }

        setGenerating(true);
        try {
            const data = await generateExercise(buildPayload());
            setPreview({ ...data, isPublished: data.isPublished ?? false });
            setRejectReason("");
            setMessage(t("admin.exercises.aiReview.messages.generated"));
            onExerciseChanged();
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("admin.exercises.aiReview.errors.generate")));
        } finally {
            setGenerating(false);
        }
    };

    const handleApprove = async () => {
        if (!preview) return;
        setError(null);
        setMessage(null);
        setReviewing(true);
        try {
            const updated = await approveExercise(preview.exerciseId, { publish: false });
            setPreview(toGenerationPreview(updated));
            setMessage(t("admin.exercises.aiReview.messages.approved"));
            onExerciseChanged();
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("admin.exercises.aiReview.errors.approve")));
        } finally {
            setReviewing(false);
        }
    };

    const handleReject = async () => {
        if (!preview) return;
        if (!rejectReason.trim()) {
            setError(t("admin.exercises.aiReview.errors.rejectReasonRequired"));
            return;
        }
        setError(null);
        setMessage(null);
        setReviewing(true);
        try {
            const updated = await rejectExercise(preview.exerciseId, {
                reason: toOptional(rejectReason),
            });
            setPreview(toGenerationPreview(updated));
            setMessage(t("admin.exercises.aiReview.messages.rejected"));
            onExerciseChanged();
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("admin.exercises.aiReview.errors.reject")));
        } finally {
            setReviewing(false);
        }
    };

    return (
        <section className="section-card ai-review-panel">
            <div className="ai-review-panel__header">
                <div>
                    <h2>{t("admin.exercises.aiReview.title")}</h2>
                    <p>{t("admin.exercises.aiReview.subtitle")}</p>
                </div>
            </div>

            <div className="ai-review-panel__grid">
                <form className="ai-review-panel__form" onSubmit={handleGenerate}>
                    {fixedBaseExercise ? (
                        <div className="ai-review-fixed-base">
                            <span className="detail-field__label">
                                {t("admin.exercises.aiReview.fields.fixedBaseExercise")}
                            </span>
                            <strong>
                                {fixedBaseExercise.exerciseCode
                                    ? `${fixedBaseExercise.exerciseCode} - `
                                    : ""}
                                {fixedBaseExercise.exTitle}
                            </strong>
                            <p className="muted-text">
                                {selectedBasePolicy.enabled
                                    ? t("admin.exercises.aiReview.fields.baseAlreadyEligible", {
                                        trialId: selectedBasePolicy.approvedTrialExerciseId || "-",
                                    })
                                    : t("admin.exercises.aiReview.fields.baseNotEligible")}
                            </p>
                        </div>
                    ) : (
                        <div className="form-field">
                            <label htmlFor="aiBaseExerciseId">
                                {t("admin.exercises.aiReview.fields.baseExercise")}
                            </label>
                            <select
                                id="aiBaseExerciseId"
                                name="baseExerciseId"
                                className="input"
                                value={form.baseExerciseId}
                                onChange={handleChange}
                                disabled={loadingBases}
                            >
                                <option value="">
                                    {loadingBases
                                        ? t("admin.exercises.aiReview.fields.loadingBases")
                                        : t("admin.exercises.aiReview.fields.noBaseExercise")}
                                </option>
                                {baseExercises.map((exercise) => (
                                    <option key={exercise.exerciseId} value={exercise.exerciseId}>
                                        {exercise.exerciseCode ? `${exercise.exerciseCode} - ` : ""}
                                        {exercise.exTitle}
                                    </option>
                                ))}
                            </select>
                            {selectedBaseExercise ? (
                                <p className="muted-text">
                                    {t("admin.exercises.aiReview.fields.selectedBase", {
                                        title: selectedBaseExercise.exTitle,
                                    })}
                                </p>
                            ) : null}
                        </div>
                    )}

                    <div className="form-field">
                        <label htmlFor="aiCustomPrompt">
                            {t("admin.exercises.aiReview.fields.customPrompt")}
                        </label>
                        <textarea
                            id="aiCustomPrompt"
                            name="customPrompt"
                            className="textarea"
                            rows={4}
                            value={form.customPrompt}
                            onChange={handleChange}
                            placeholder={t("admin.exercises.aiReview.placeholders.customPrompt")}
                        />
                    </div>

                    <div className="form-field">
                        <label htmlFor="aiBusinessContext">
                            {t("admin.exercises.aiReview.fields.businessContext")}
                        </label>
                        <textarea
                            id="aiBusinessContext"
                            name="businessContext"
                            className="textarea"
                            rows={3}
                            value={form.businessContext}
                            onChange={handleChange}
                            placeholder={t("admin.exercises.aiReview.placeholders.businessContext")}
                        />
                    </div>

                    <div className="ai-review-panel__inline-fields">
                        <div className="form-field">
                            <label htmlFor="aiDifficulty">
                                {t("admin.exercises.aiReview.fields.difficulty")}
                            </label>
                            <select
                                id="aiDifficulty"
                                name="difficulty"
                                className="input"
                                value={form.difficulty}
                                onChange={handleChange}
                            >
                                {difficultyValues.map((value) => (
                                    <option key={value} value={value}>
                                        {t(`admin.exercises.aiReview.difficulty.${value.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label htmlFor="aiBusinessDomain">
                                {t("admin.exercises.aiReview.fields.businessDomain")}
                            </label>
                            <input
                                id="aiBusinessDomain"
                                name="businessDomain"
                                className="input"
                                value={form.businessDomain}
                                onChange={handleChange}
                                placeholder={t("admin.exercises.aiReview.placeholders.businessDomain")}
                            />
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="aiAdditionalRequirements">
                            {t("admin.exercises.aiReview.fields.additionalRequirements")}
                        </label>
                        <textarea
                            id="aiAdditionalRequirements"
                            name="additionalRequirements"
                            className="textarea"
                            rows={3}
                            value={form.additionalRequirements}
                            onChange={handleChange}
                            placeholder={t("admin.exercises.aiReview.placeholders.additionalRequirements")}
                        />
                    </div>

                    {error ? <div className="alert">{error}</div> : null}
                    {message ? <div className="alert alert-success">{message}</div> : null}

                    <button className="btn btn-primary" type="submit" disabled={generating}>
                        <Plus size={16} aria-hidden="true" />
                        {generating
                            ? t("admin.exercises.aiReview.actions.generating")
                            : t(
                                reviewStatus === "REJECTED"
                                    ? "admin.exercises.aiReview.actions.regenerate"
                                    : "admin.exercises.aiReview.actions.generate",
                            )}
                    </button>
                </form>

                <div className="ai-review-panel__preview">
                    {preview ? (
                        <>
                            <div className="ai-review-panel__badges">
                                <span className="tag tag--ai">
                                    {t("admin.exercises.sources.staff_ai_trial", {
                                        defaultValue: preview.exerciseSource,
                                    })}
                                </span>
                                <span className="tag">{preview.exerciseCode}</span>
                                <span className={`tag ${getExerciseReviewStatusTagClass(reviewStatus)}`}>
                                    {t(
                                        `admin.exercises.aiReview.status.${reviewStatus.toLowerCase()}`,
                                    )}
                                </span>
                                <ExercisePublishBadge
                                    exercise={toExerciseBadgePreview(preview, isPreviewPublished)}
                                />
                            </div>
                            <div className="ai-review-panel__title-block">
                                <h3>{preview.title}</h3>
                                <p>{preview.description}</p>
                            </div>
                            {reviewMetadata.rejectReason ? (
                                <div className="ai-review-warning">
                                    {t("admin.exercises.aiReview.detail.rejectReason")}:{" "}
                                    {reviewMetadata.rejectReason}
                                </div>
                            ) : null}
                            <ScenarioViewer data={preview.scenarioData} showTechnicalData={false} />
                            <div className="ai-review-panel__review-box">
                                {reviewStatus !== "APPROVED" && !isPreviewPublished ? (
                                    <div className="ai-review-warning">
                                        {t("admin.exercises.aiReview.detail.publishGuard")}
                                    </div>
                                ) : null}
                                {canRejectPreview ? (
                                    <div className="form-field">
                                        <label htmlFor="aiRejectReason">
                                            {t("admin.exercises.aiReview.fields.rejectReason")}
                                        </label>
                                        <textarea
                                            id="aiRejectReason"
                                            className="textarea"
                                            rows={2}
                                            value={rejectReason}
                                            onChange={(event) => setRejectReason(event.target.value)}
                                            placeholder={t("admin.exercises.aiReview.placeholders.rejectReason")}
                                            disabled={reviewing}
                                        />
                                    </div>
                                ) : null}
                                {canApprovePreview || canRejectPreview ? (
                                    <div className="ai-review-panel__actions">
                                        {canApprovePreview ? (
                                            <button
                                                type="button"
                                                className="btn btn-outline"
                                                onClick={handleApprove}
                                                disabled={reviewing}
                                            >
                                                <CheckCircle size={16} aria-hidden="true" />
                                                {reviewing
                                                    ? t("admin.exercises.aiReview.actions.reviewing")
                                                    : t("admin.exercises.aiReview.actions.approve")}
                                            </button>
                                        ) : null}
                                        {canRejectPreview ? (
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
                        </>
                    ) : (
                        <div className="empty-state">
                            <h3>{t("admin.exercises.aiReview.empty.title")}</h3>
                            <p>{t("admin.exercises.aiReview.empty.body")}</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const toOptional = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

const toGenerationPreview = (exercise: Exercise): ExerciseGenerationResponse => ({
    exerciseId: exercise.exerciseId,
    exerciseCode: exercise.exerciseCode ?? "",
    title: exercise.exTitle,
    description: exercise.exDescription ?? "",
    scenarioData: exercise.scenarioData ?? {},
    exerciseSource: "AI_GENERATED",
    ownerStudentId: exercise.ownerStudent?.userId ?? null,
    baseExerciseId: exercise.baseExerciseId ?? null,
    isPublished: exercise.isPublished,
});

const toExerciseBadgePreview = (
    preview: ExerciseGenerationResponse,
    isPublished: boolean,
): Exercise => ({
    exerciseId: preview.exerciseId,
    exerciseCode: preview.exerciseCode,
    exTitle: preview.title,
    exDescription: preview.description,
    scenarioData: preview.scenarioData,
    exerciseSource: "AI_GENERATED",
    createdBy: {
        userId: 0,
        userEmail: "",
        fullName: "",
        userGender: null,
        userDob: null,
        userPhone: null,
        userAddress: null,
        role: {
            roleId: 0,
            roleName: "ADMIN",
        },
        isActive: true,
    },
    ownerStudent: null,
    baseExerciseId: preview.baseExerciseId ?? null,
    isPublished,
});

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

export default ExerciseAiReviewPanel;
