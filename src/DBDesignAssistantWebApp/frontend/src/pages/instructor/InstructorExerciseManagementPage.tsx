import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { instructorExerciseApi } from "../../services/instructorExerciseApi";
import type { Exercise, ExerciseRequest } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import ScenarioDataEditor from "../../components/admin/ScenarioDataEditor";
import { useTranslation } from "react-i18next";

import { Eye, Edit2, Trash2, CheckCircle, XCircle, Plus } from "lucide-react";

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
    const [sourceFilter, setSourceFilter] = useState("ALL");
    const [publishedFilter, setPublishedFilter] = useState("ALL");
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
            exerciseSource: sourceFilter === "ALL" ? undefined : sourceFilter,
            isPublished:
                publishedFilter === "ALL" ? undefined : publishedFilter === "PUBLISHED",
        };
    };

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
        loadExercises(buildFilters());
    };

    const handleResetFilters = () => {
        setSearchText("");
        setSourceFilter("ALL");
        setPublishedFilter("ALL");
        loadExercises({});
    };

    const handleDelete = async (exerciseId: number) => {
        if (!window.confirm(t("admin.exercises.confirmDelete"))) {
            return;
        }
        setError(null);
        try {
            await instructorExerciseApi.delete(exerciseId);
            setExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
        } catch {
            setError(t("admin.exercises.deleteError"));
        }
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

    return (
        <InstructorLayout
            title={t("admin.exercises.title")}
            subtitle={t("admin.exercises.subtitle")}
            onSignOut={handleSignOut}
        >
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{t("admin.exercises.title")}</h2>
                        <p style={{ margin: 0, color: "var(--ink-soft)" }}>{t("admin.exercises.subtitle")}</p>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                        <Plus size={12} /> {t("admin.exercises.form.openCreate")}
                    </button>
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
                        onChange={(event) => setSourceFilter(event.target.value)}
                        style={{ maxWidth: 160, display: "none" }} // Hide source filter for instructor
                    >
                        <option value="ALL">{t("admin.exercises.filters.allSources")}</option>
                        <option value="MANUAL">{t("admin.exercises.filters.manual")}</option>
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
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("admin.exercises.columns.code")}</th>
                                <th>{t("admin.exercises.columns.title")}</th>
                                {/* <th>{t("admin.exercises.columns.source")}</th> */}
                                {/* <th>{t("admin.exercises.columns.creator")}</th> */}
                                <th>{t("admin.exercises.columns.published")}</th>
                                <th style={{ width: 140 }}>{t("admin.exercises.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exercises.map((exercise) => (
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
                                    {/* <td>
                                        <span className={`tag ${exercise.exerciseSource === "AI_GENERATED" ? "tag--ai" : ""}`}>
                                            {exercise.exerciseSource === "AI_GENERATED"
                                                ? t("admin.exercises.filters.aiGenerated")
                                                : t("admin.exercises.filters.manual")}
                                        </span>
                                    </td> */}
                                    {/* <td>{exercise.createdBy?.fullName || "—"}</td> */}
                                    <td>
                                        <span className={`tag ${exercise.isPublished ? "tag--published" : ""}`}>
                                            {exercise.isPublished
                                                ? t("admin.exercises.yes")
                                                : t("admin.exercises.no")}
                                        </span>
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
                                                title={t("admin.exercises.actions.edit")}
                                                onClick={() => handleEdit(exercise)}
                                                aria-label={t("admin.exercises.actions.edit")}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {/* Publish / Unpublish */}
                                            <button
                                                type="button"
                                                className="btn btn-icon"
                                                title={exercise.isPublished
                                                    ? t("admin.exercises.actions.unpublish")
                                                    : t("admin.exercises.actions.publish")}
                                                onClick={() => handleTogglePublish(exercise)}
                                                aria-label={exercise.isPublished
                                                    ? t("admin.exercises.actions.unpublish")
                                                    : t("admin.exercises.actions.publish")}
                                            >
                                                {exercise.isPublished ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                            </button>
                                            {/* Delete */}
                                            <button
                                                type="button"
                                                className="btn btn-icon btn-danger"
                                                title={t("admin.exercises.actions.delete")}
                                                onClick={() => handleDelete(exercise.exerciseId)}
                                                aria-label={t("admin.exercises.actions.delete")}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </InstructorLayout>
    );
};

export default InstructorExerciseManagementPage;
