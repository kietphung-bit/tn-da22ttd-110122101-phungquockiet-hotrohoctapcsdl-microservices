import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { instructorExerciseApi } from "../../services/instructorExerciseApi";
import type { Exercise, ExerciseRequest } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import ScenarioDataEditor from "../../components/admin/ScenarioDataEditor";
import {
    ExercisePublishBadge,
    ExerciseReviewStatusBadge,
    ExerciseSourceBadge,
} from "../../components/exercises/ExerciseStatusBadges";
import {
    getExerciseCategory,
    isStaffGeneratedAiExercise,
    readExerciseReviewMetadata,
} from "../../utils/exerciseReview";
import { useTranslation } from "react-i18next";
import "../../components/exercises/ExerciseAiReviewPanel.css";

import { Eye, Edit2, Trash2, CheckCircle, XCircle, Plus, Sparkles } from "lucide-react";

type ReviewStatusFilter = "ALL" | "DRAFT" | "APPROVED" | "REJECTED";
type ExerciseCategoryFilter = "LIBRARY" | "MANUAL" | "STAFF_AI_TRIAL";

type ExerciseListFilters = {
    searchText: string;
    sourceFilter: ExerciseCategoryFilter;
    publishedFilter: string;
    reviewStatusFilter: ReviewStatusFilter;
};

type PendingPublishAction = {
    exercise: Exercise;
};

type PendingDeleteAction = {
    exercise: Exercise;
};

const DEFAULT_EXERCISE_LIST_FILTERS: ExerciseListFilters = {
    searchText: "",
    sourceFilter: "LIBRARY",
    publishedFilter: "ALL",
    reviewStatusFilter: "ALL",
};

const matchesExerciseListFilters = (exercise: Exercise, filters: ExerciseListFilters) => {
    const query = filters.searchText.trim().toLowerCase();
    if (query) {
        const searchable = [
            exercise.exerciseCode,
            exercise.exTitle,
            exercise.exDescription,
            exercise.createdBy?.fullName,
            exercise.createdBy?.userEmail,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        if (!searchable.includes(query)) {
            return false;
        }
    }

    const category = getExerciseCategory(exercise);
    if (filters.sourceFilter !== "LIBRARY" && category !== filters.sourceFilter) {
        return false;
    }

    if (filters.publishedFilter !== "ALL") {
        const publishState = exercise.isPublished ? "PUBLISHED" : "UNPUBLISHED";
        if (publishState !== filters.publishedFilter) {
            return false;
        }
    }

    if (filters.reviewStatusFilter !== "ALL") {
        if (!isStaffGeneratedAiExercise(exercise)) {
            return false;
        }
        const metadata = readExerciseReviewMetadata(exercise.scenarioData);
        if (metadata.effectiveStatus !== filters.reviewStatusFilter) {
            return false;
        }
    }

    return true;
};

const hasActiveExerciseFilters = (filters: ExerciseListFilters) =>
    Boolean(filters.searchText.trim())
    || filters.sourceFilter !== "LIBRARY"
    || filters.publishedFilter !== "ALL"
    || filters.reviewStatusFilter !== "ALL";

const getEmptyVariant = (filters: ExerciseListFilters) => {
    if (!hasActiveExerciseFilters(filters)) {
        return "noExercises";
    }
    if (filters.reviewStatusFilter === "DRAFT") {
        return "noAiDraft";
    }
    return "noFilterResults";
};

// ─── Component ────────────────────────────────────────────────────────────────

const InstructorExerciseManagementPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formCreatedById, setFormCreatedById] = useState<number | null>(null);
    const [searchText, setSearchText] = useState("");
    const [sourceFilter, setSourceFilter] = useState<ExerciseCategoryFilter>("LIBRARY");
    const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("ALL");
    const [publishedFilter, setPublishedFilter] = useState("ALL");
    const [pendingPublishAction, setPendingPublishAction] = useState<PendingPublishAction | null>(null);
    const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
    const [appliedFilters, setAppliedFilters] = useState<ExerciseListFilters>(
        DEFAULT_EXERCISE_LIST_FILTERS,
    );
    const [formData, setFormData] = useState({
        exTitle: "",
        exDescription: "",
        scenarioData: {} as Record<string, unknown>,
        isPublished: false,
    });

    const buildFilters = () => {
        const trimmed = searchText.trim();
        return {
            search: trimmed ? trimmed : undefined,
            exerciseSource:
                sourceFilter === "MANUAL"
                    ? "MANUAL"
                    : sourceFilter === "STAFF_AI_TRIAL"
                        ? "AI_GENERATED"
                        : undefined,
            isPublished:
                publishedFilter === "ALL" ? undefined : publishedFilter === "PUBLISHED",
        };
    };

    const buildAppliedFilters = (): ExerciseListFilters => ({
        searchText: searchText.trim(),
        sourceFilter,
        publishedFilter,
        reviewStatusFilter,
    });

    const loadExercises = useCallback(async (filters?: {
        search?: string;
        exerciseSource?: string;
        isPublished?: boolean;
    }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await instructorExerciseApi.getAll(filters ?? {});
            setExercises(data);
        } catch {
            setError(t("admin.exercises.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const init = async () => {
            await loadExercises({});
        };
        init();
    }, [loadExercises]);

    const handleApplyFilters = () => {
        setAppliedFilters(buildAppliedFilters());
        loadExercises(buildFilters());
    };

    const handleResetFilters = () => {
        setSearchText("");
        setSourceFilter("LIBRARY");
        setReviewStatusFilter("ALL");
        setPublishedFilter("ALL");
        setAppliedFilters(DEFAULT_EXERCISE_LIST_FILTERS);
        loadExercises({});
    };

    const requestDelete = (exercise: Exercise) => {
        setPendingDeleteAction({ exercise });
    };

    const handleDelete = async (exercise: Exercise) => {
        setPendingDeleteAction(null);
        setError(null);
        try {
            await instructorExerciseApi.delete(exercise.exerciseId);
            setExercises((prev) => prev.filter((e) => e.exerciseId !== exercise.exerciseId));
        } catch {
            setError(t("admin.exercises.deleteError"));
        }
    };

    const requestTogglePublish = (exercise: Exercise) => {
        setPendingPublishAction({ exercise });
    };

    const handleTogglePublish = async (exercise: Exercise) => {
        setError(null);
        try {
            const updated = exercise.isPublished
                ? await instructorExerciseApi.unpublish(exercise.exerciseId)
                : await instructorExerciseApi.publish(exercise.exerciseId);
            setExercises((prev) =>
                prev.map((item) => (item.exerciseId === updated.exerciseId ? updated : item))
            );
        } catch {
            setError(t("admin.exercises.publishError"));
        }
    };

    const handleConfirmTogglePublish = () => {
        const action = pendingPublishAction;
        if (!action) {
            return;
        }
        setPendingPublishAction(null);
        void handleTogglePublish(action.exercise);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            exTitle: "",
            exDescription: "",
            scenarioData: {},
            isPublished: false,
        });
        setFormCreatedById(user?.userId ?? null);
        setFieldErrors({});
        setFormError(null);
    };

    const apiErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            const data = err.response?.data as { message?: string; data?: Record<string, string> } | undefined;
            if (data?.data) {
                setFieldErrors(data.data);
            }
            return data?.message || fallback;
        }
        return fallback;
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.exTitle.trim()) {
            errors.exTitle = t("admin.exercises.validation.titleRequired");
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        if (!formCreatedById) {
            setFormError(t("admin.exercises.validation.createdByMissing"));
            return;
        }
        if (!validateForm()) {
            return;
        }

        const payload: ExerciseRequest = {
            exTitle: formData.exTitle.trim(),
            exDescription: formData.exDescription.trim() || null,
            scenarioData: formData.scenarioData,
            createdById: formCreatedById,
            isPublished: formData.isPublished,
        };

        try {
            if (editingId) {
                const updated = await instructorExerciseApi.update(editingId, payload);
                setExercises((prev) =>
                    prev.map((exercise) =>
                        exercise.exerciseId === updated.exerciseId ? updated : exercise
                    )
                );
            } else {
                const created = await instructorExerciseApi.create(payload);
                setExercises((prev) => [created, ...prev]);
            }
            resetForm();
            setIsFormOpen(false);
        } catch (err) {
            setFormError(apiErrorMessage(err, t("admin.exercises.saveError")));
        }
    };

    const handleOpenCreate = () => {
        resetForm();
        setFormCreatedById(user?.userId ?? null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setFieldErrors({});
        setFormError(null);
    };

    const handleEdit = (exercise: Exercise) => {
        setEditingId(exercise.exerciseId);
        setFormData({
            exTitle: exercise.exTitle,
            exDescription: exercise.exDescription || "",
            scenarioData: exercise.scenarioData ?? {},
            isPublished: exercise.isPublished,
        });
        setFormCreatedById(exercise.createdBy?.userId ?? user?.userId ?? null);
        setFieldErrors({});
        setFormError(null);
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const filteredExercises = exercises.filter((exercise) =>
        matchesExerciseListFilters(exercise, appliedFilters)
    );
    const emptyVariant = getEmptyVariant(appliedFilters);
    const pendingPublishKind = pendingPublishAction?.exercise.isPublished ? "unpublish" : "publish";

    return (
        <InstructorLayout
            title={t("admin.exercises.title")}
            subtitle={t("admin.exercises.subtitle")}
            onSignOut={handleSignOut}
        >
            <ConfirmDialog
                open={Boolean(pendingPublishAction)}
                title={t(`admin.exercises.confirmations.${pendingPublishKind}.title`)}
                message={t(`admin.exercises.confirmations.${pendingPublishKind}.message`)}
                confirmLabel={t(`admin.exercises.actions.${pendingPublishKind}`)}
                cancelLabel={t("common.cancel")}
                variant={pendingPublishAction?.exercise.isPublished ? "warning" : "normal"}
                onCancel={() => setPendingPublishAction(null)}
                onConfirm={handleConfirmTogglePublish}
            />
            <ConfirmDialog
                open={Boolean(pendingDeleteAction)}
                title={t("admin.exercises.confirmations.delete.title")}
                message={t("admin.exercises.confirmations.delete.message")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                variant="danger"
                onCancel={() => setPendingDeleteAction(null)}
                onConfirm={() => {
                    if (pendingDeleteAction) {
                        void handleDelete(pendingDeleteAction.exercise);
                    }
                }}
            />
            {error && <div className="alert">{error}</div>}

            {/* Create/Edit Exercise Modal */}
            {isFormOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>
                                {editingId
                                    ? t("admin.exercises.form.editTitle")
                                    : t("admin.exercises.form.createTitle")}
                            </h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseForm}>
                                {t("admin.exercises.form.close")}
                            </button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleSubmit} className="stagger">
                            <div className="form-field">
                                <label htmlFor="exTitle">{t("admin.exercises.form.title")}</label>
                                <input
                                    id="exTitle"
                                    className="input"
                                    type="text"
                                    value={formData.exTitle}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, exTitle: event.target.value }))
                                    }
                                />
                                {fieldErrors.exTitle && <div className="alert">{fieldErrors.exTitle}</div>}
                            </div>
                            <div className="form-field">
                                <label htmlFor="exDescription">{t("admin.exercises.form.description")}</label>
                                <textarea
                                    id="exDescription"
                                    className="textarea"
                                    value={formData.exDescription}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, exDescription: event.target.value }))
                                    }
                                    rows={3}
                                />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.exercises.form.scenario")}</label>
                                <ScenarioDataEditor
                                    value={formData.scenarioData}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, scenarioData: v }))}
                                    error={fieldErrors.scenarioData}
                                />
                            </div>
                            <div className="form-field" style={{ flexDirection: "row", alignItems: "center" }}>
                                <input
                                    id="isPublished"
                                    type="checkbox"
                                    checked={formData.isPublished}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, isPublished: event.target.checked }))
                                    }
                                />
                                <label htmlFor="isPublished">{t("admin.exercises.form.published")}</label>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-primary">
                                    {editingId
                                        ? t("admin.exercises.form.update")
                                        : t("admin.exercises.form.create")}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                                    {t("admin.exercises.form.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Exercises Table Section */}
            <section className="section-card">
                <div className="exercise-list-toolbar">
                    <div>
                        <h2 style={{ margin: 0 }}>{t("admin.exercises.title")}</h2>
                        <p style={{ margin: 0, color: "var(--ink-soft)" }}>{t("admin.exercises.subtitle")}</p>
                    </div>
                    <div className="exercise-list-toolbar__actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => navigate("/instructor/exercises/ai-generate")}
                        >
                            <Sparkles size={16} aria-hidden="true" />
                            {t("admin.exercises.aiReview.openGenerator")}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                            <Plus size={16} aria-hidden="true" />
                            {t("admin.exercises.form.openCreate")}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <input
                        className="input"
                        type="text"
                        placeholder={t("admin.exercises.filters.searchPlaceholder")}
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                        style={{ maxWidth: 240 }}
                    />
                    <select
                        className="input"
                        value={sourceFilter}
                        onChange={(event) =>
                            setSourceFilter(event.target.value as ExerciseCategoryFilter)
                        }
                        style={{ maxWidth: 220 }}
                    >
                        <option value="LIBRARY">{t("admin.exercises.filters.staffLibrary")}</option>
                        <option value="MANUAL">{t("admin.exercises.filters.manual")}</option>
                        <option value="STAFF_AI_TRIAL">
                            {t("admin.exercises.filters.staffAiTrial")}
                        </option>
                    </select>
                    <select
                        className="input"
                        value={reviewStatusFilter}
                        onChange={(event) =>
                            setReviewStatusFilter(event.target.value as ReviewStatusFilter)
                        }
                        style={{ maxWidth: 180 }}
                    >
                        <option value="ALL">{t("admin.exercises.filters.allReviewStatuses")}</option>
                        <option value="DRAFT">{t("admin.exercises.aiReview.status.draft")}</option>
                        <option value="APPROVED">{t("admin.exercises.aiReview.status.approved")}</option>
                        <option value="REJECTED">{t("admin.exercises.aiReview.status.rejected")}</option>
                    </select>
                    <select
                        className="input"
                        value={publishedFilter}
                        onChange={(event) => setPublishedFilter(event.target.value)}
                        style={{ maxWidth: 160 }}
                    >
                        <option value="ALL">{t("admin.exercises.filters.allPublish")}</option>
                        <option value="PUBLISHED">{t("admin.exercises.filters.published")}</option>
                        <option value="UNPUBLISHED">{t("admin.exercises.filters.unpublished")}</option>
                    </select>
                    <button type="button" className="btn btn-outline" onClick={handleApplyFilters}>
                        {t("admin.exercises.filters.apply")}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleResetFilters}>
                        {t("admin.exercises.filters.reset")}
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <p>{t("admin.exercises.loading")}</p>
                ) : filteredExercises.length === 0 ? (
                    <div className="exercise-list-empty">
                        <h3>{t(`admin.exercises.empty.${emptyVariant}.title`)}</h3>
                        <p>{t(`admin.exercises.empty.${emptyVariant}.body`)}</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("admin.exercises.columns.code")}</th>
                                <th>{t("admin.exercises.columns.title")}</th>
                                <th>{t("admin.exercises.columns.source")}</th>
                                <th>{t("admin.exercises.columns.review")}</th>
                                <th>{t("admin.exercises.columns.published")}</th>
                                <th style={{ width: 160 }}>{t("admin.exercises.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExercises.map((exercise) => {
                                const canPublishExercise = exercise.exerciseSource === "MANUAL";
                                return (
                                <tr key={exercise.exerciseId}>
                                    <td>
                                        <code style={{ fontSize: "0.85rem" }}>
                                            {exercise.exerciseCode || "—"}
                                        </code>
                                    </td>
                                    <td style={{ maxWidth: 220 }}>
                                        <span style={{ fontWeight: 500 }}>{exercise.exTitle}</span>
                                        {exercise.exDescription && (
                                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: 2 }}>
                                                {exercise.exDescription.length > 60
                                                    ? exercise.exDescription.slice(0, 60) + "…"
                                                    : exercise.exDescription}
                                            </p>
                                        )}
                                    </td>
                                    <td>
                                        <ExerciseSourceBadge exercise={exercise} />
                                    </td>
                                    <td>
                                        {isStaffGeneratedAiExercise(exercise) ? (
                                            <ExerciseReviewStatusBadge exercise={exercise} />
                                        ) : (
                                            <span style={{ color: "var(--ink-soft)" }}>-</span>
                                        )}
                                    </td>
                                    {/* <td>{exercise.createdBy?.fullName || "—"}</td> */}
                                    <td>
                                        <ExercisePublishBadge exercise={exercise} />
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            {/* View detail */}
                                            <button
                                                type="button"
                                                className="btn btn-icon"
                                                title={t("admin.exercises.actions.viewDetail")}
                                                onClick={() => navigate(`/instructor/exercises/${exercise.exerciseId}`)}
                                                aria-label={t("admin.exercises.actions.viewDetail")}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {/* Edit */}
                                            <button
                                                type="button"
                                                className="btn btn-icon"
                                                title={exercise.exerciseSource === "AI_GENERATED"
                                                    ? t("admin.exercises.aiReview.actions.reviewInsteadOfEdit")
                                                    : t("admin.exercises.actions.edit")}
                                                onClick={() => handleEdit(exercise)}
                                                disabled={exercise.exerciseSource === "AI_GENERATED"}
                                                aria-label={t("admin.exercises.actions.edit")}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {canPublishExercise ? (
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    title={exercise.isPublished
                                                        ? t("admin.exercises.actions.unpublish")
                                                        : t("admin.exercises.actions.publish")}
                                                    onClick={() => requestTogglePublish(exercise)}
                                                    aria-label={exercise.isPublished
                                                        ? t("admin.exercises.actions.unpublish")
                                                        : t("admin.exercises.actions.publish")}
                                                >
                                                    {exercise.isPublished ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                            ) : null}
                                            {/* Delete */}
                                            <button
                                                type="button"
                                                className="btn btn-icon btn-danger"
                                                title={t("admin.exercises.actions.delete")}
                                                onClick={() => requestDelete(exercise)}
                                                aria-label={t("admin.exercises.actions.delete")}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </section>
        </InstructorLayout>
    );
};

export default InstructorExerciseManagementPage;
