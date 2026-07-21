import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import type { Exercise } from "../../types";

type ApiErrorLike = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

type ExerciseArchiveView = "active" | "archived";

type PendingExerciseArchiveAction = {
    exercise: Exercise;
    archived: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const candidate = error as ApiErrorLike;
    return candidate.response?.data?.message || candidate.message || fallback;
};

const formatDateTime = (value: string | null | undefined) => {
    return value ? new Date(value).toLocaleString() : "-";
};

const StudentExerciseListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [archiveView, setArchiveView] = useState<ExerciseArchiveView>("active");
    const [archiveActionId, setArchiveActionId] = useState<number | null>(null);
    const [pendingArchiveAction, setPendingArchiveAction] =
        useState<PendingExerciseArchiveAction | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchExercises = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const data = await studentExerciseApi.getAll({
                search: appliedSearch || undefined,
                archived: archiveView === "archived",
            });
            setExercises(data);
        } catch (error: unknown) {
            console.error("Failed to fetch exercises:", error);
            setErrorMsg(getErrorMessage(error, t("student.exerciseList.errors.load")));
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, archiveView, t]);

    useEffect(() => {
        const init = async () => {
            await fetchExercises();
        };
        init();
    }, [fetchExercises]);

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        setAppliedSearch(search.trim());
    };

    const requestArchiveToggle = (exercise: Exercise, archived: boolean) => {
        setPendingArchiveAction({ exercise, archived });
    };

    const handleArchiveToggle = async (exercise: Exercise, archived: boolean) => {
        setArchiveActionId(exercise.exerciseId);
        setErrorMsg("");
        try {
            const updated = archived
                ? await studentExerciseApi.archive(exercise.exerciseId)
                : await studentExerciseApi.restore(exercise.exerciseId);
            const shouldRemainInCurrentView = Boolean(updated.studentArchived) === (archiveView === "archived");
            setExercises((current) => {
                if (!shouldRemainInCurrentView) {
                    return current.filter((item) => item.exerciseId !== updated.exerciseId);
                }
                return current.map((item) => item.exerciseId === updated.exerciseId ? updated : item);
            });
        } catch (error: unknown) {
            setErrorMsg(getErrorMessage(
                error,
                archived
                    ? t("student.exerciseList.errors.archive")
                    : t("student.exerciseList.errors.restore")
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
        void handleArchiveToggle(action.exercise, action.archived);
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const isArchivedView = archiveView === "archived";
    const currentUserId = user?.userId;
    const colSpan = isArchivedView ? 6 : 5;
    const pendingArchiveKind = pendingArchiveAction?.archived ? "archive" : "restore";

    return (
        <StudentLayout title={t("student.exerciseList.title")} onSignOut={handleSignOut}>
            <ConfirmDialog
                open={Boolean(pendingArchiveAction)}
                title={t(`student.exerciseList.confirmations.${pendingArchiveKind}.title`)}
                message={t(`student.exerciseList.confirmations.${pendingArchiveKind}.message`)}
                confirmLabel={t(`student.exerciseList.actions.${pendingArchiveKind}`)}
                cancelLabel={t("common.cancel")}
                variant={pendingArchiveAction?.archived ? "warning" : "normal"}
                onCancel={() => setPendingArchiveAction(null)}
                onConfirm={handleConfirmArchiveToggle}
            />
            <div className="page-header">
                <div>
                    <h2>{t("student.exerciseList.title")}</h2>
                    <p className="detail-field__text">{t("student.exerciseList.subtitle")}</p>
                </div>
                <div
                    className="action-group"
                    role="tablist"
                    aria-label={t("student.exerciseList.filters.ariaLabel")}
                >
                    <button
                        className={`btn btn-sm ${archiveView === "active" ? "btn-primary" : "btn-outline"}`}
                        type="button"
                        role="tab"
                        aria-selected={archiveView === "active"}
                        onClick={() => setArchiveView("active")}
                    >
                        {t("student.exerciseList.filters.active")}
                    </button>
                    <button
                        className={`btn btn-sm ${archiveView === "archived" ? "btn-primary" : "btn-outline"}`}
                        type="button"
                        role="tab"
                        aria-selected={archiveView === "archived"}
                        onClick={() => setArchiveView("archived")}
                    >
                        {t("student.exerciseList.filters.archived")}
                    </button>
                </div>
            </div>

            <form
                onSubmit={handleSearch}
                className="search-bar"
                style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
            >
                <input
                    type="text"
                    placeholder={t("student.exerciseList.searchPlaceholder")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input"
                />
                <button type="submit" className="btn btn-primary">
                    <Search size={16} aria-hidden="true" />
                    {t("student.exerciseList.actions.search")}
                </button>
            </form>

            {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

            {loading ? (
                <div className="loading-text">{t("student.exerciseList.loading")}</div>
            ) : (
                <div className="section-card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("student.exerciseList.columns.id")}</th>
                                <th>{t("student.exerciseList.columns.exerciseCode")}</th>
                                <th>{t("student.exerciseList.columns.title")}</th>
                                <th>{t("student.exerciseList.columns.source")}</th>
                                {isArchivedView ? <th>{t("student.exerciseList.columns.archivedAt")}</th> : null}
                                <th>{t("student.exerciseList.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exercises.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="text-center">
                                        {isArchivedView
                                            ? t("student.exerciseList.emptyArchived")
                                            : t("student.exerciseList.empty")}
                                    </td>
                                </tr>
                            ) : (
                                exercises.map((exercise) => (
                                    <tr key={exercise.exerciseId}>
                                        <td>{exercise.exerciseId}</td>
                                        <td>{exercise.exerciseCode ?? "-"}</td>
                                        <td>{exercise.exTitle}</td>
                                        <td>{t(`student.exerciseList.sources.${exercise.exerciseSource ?? "unknown"}`)}</td>
                                        {isArchivedView ? <td>{formatDateTime(exercise.studentArchivedAt)}</td> : null}
                                        <td>
                                            <div className="action-group">
                                                <button
                                                    onClick={() => navigate(`/student/exercises/${exercise.exerciseId}`)}
                                                    className="btn btn-sm btn-outline"
                                                    type="button"
                                                >
                                                    {t("student.exerciseList.actions.viewDetail")}
                                                </button>
                                                {canArchiveExercise(exercise, currentUserId) && (
                                                    isArchivedView ? (
                                                        <button
                                                            onClick={() => requestArchiveToggle(exercise, false)}
                                                            className="btn btn-sm btn-outline"
                                                            type="button"
                                                            disabled={archiveActionId === exercise.exerciseId}
                                                        >
                                                            
                                                            {archiveActionId === exercise.exerciseId
                                                                ? t("student.exerciseList.actions.restoring")
                                                                : t("student.exerciseList.actions.restore")}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => requestArchiveToggle(exercise, true)}
                                                            className="btn btn-sm btn-outline"
                                                            type="button"
                                                            disabled={archiveActionId === exercise.exerciseId}
                                                        >
                                                            
                                                            {archiveActionId === exercise.exerciseId
                                                                ? t("student.exerciseList.actions.archiving")
                                                                : t("student.exerciseList.actions.archive")}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </StudentLayout>
    );
};

const canArchiveExercise = (exercise: Exercise, currentUserId: number | undefined) => {
    return exercise.exerciseSource === "AI_GENERATED"
        && exercise.ownerStudent?.userId === currentUserId;
};

export default StudentExerciseListPage;
