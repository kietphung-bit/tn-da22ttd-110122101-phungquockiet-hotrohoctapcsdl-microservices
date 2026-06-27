import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../components/layouts/AdminLayout";
import SampleSolutionEditor from "../components/admin/SampleSolutionEditor";
import ScenarioViewer from "../components/viewers/ScenarioViewer";
import exerciseApi from "../services/exerciseApi";
import type { Exercise } from "../types";

type Tab = "info" | "solution";

const ExerciseDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();

    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("info");

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    useEffect(() => {
        const load = async () => {
            if (!id) {
                setError(t("admin.exercises.detail.loadError"));
                setLoading(false);
                return;
            }
            const exerciseId = parseInt(id, 10);
            if (isNaN(exerciseId)) {
                setError(t("admin.exercises.detail.loadError"));
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await exerciseApi.getExerciseById(exerciseId);
                setExercise(data);
            } catch {
                setError(t("admin.exercises.detail.loadError"));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, t]);

    return (
        <AdminLayout
            title={exercise?.exTitle || t("admin.exercises.detail.loading")}
            subtitle={exercise?.exerciseCode || ""}
            onSignOut={handleSignOut}
        >
            {/* Back breadcrumb */}
            <button
                type="button"
                className="btn btn-ghost"
                style={{ marginBottom: 16, paddingLeft: 0, fontWeight: 500 }}
                onClick={() => navigate("/admin/exercises")}
            >
                {t("admin.exercises.detail.backToList")}
            </button>

            {loading && (
                <p className="loading-text">{t("admin.exercises.detail.loading")}</p>
            )}
            {error && <div className="alert">{error}</div>}

            {exercise && (
                <section className="section-card fade-in">
                    {/* Tab Bar */}
                    <div className="detail-tab-bar">
                        <button
                            type="button"
                            id="tab-info"
                            className={`detail-tab-btn ${activeTab === "info" ? "active" : ""}`}
                            onClick={() => setActiveTab("info")}
                        >
                            {t("admin.exercises.detail.tabInfo")}
                        </button>
                        <button
                            type="button"
                            id="tab-solution"
                            className={`detail-tab-btn ${activeTab === "solution" ? "active" : ""}`}
                            onClick={() => setActiveTab("solution")}
                        >
                            {t("admin.exercises.detail.tabSampleSolution")}
                        </button>
                    </div>

                    {/* Tab: Info */}
                    {activeTab === "info" && (
                        <div className="detail-tab-content stagger">
                            <div className="detail-field-grid">
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.code")}
                                    </span>
                                    <span className="detail-field__value">
                                        {exercise.exerciseCode || "—"}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.title")}
                                    </span>
                                    <span className="detail-field__value">{exercise.exTitle}</span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.source")}
                                    </span>
                                    <span
                                        className={`tag ${
                                            exercise.exerciseSource === "AI_GENERATED"
                                                ? "tag--ai"
                                                : ""
                                        }`}
                                    >
                                        {exercise.exerciseSource === "AI_GENERATED"
                                            ? t("admin.exercises.filters.aiGenerated")
                                            : t("admin.exercises.filters.manual")}
                                    </span>
                                </div>
                                <div className="detail-field">
                                    <span className="detail-field__label">
                                        {t("admin.exercises.detail.fields.published")}
                                    </span>
                                    <span
                                        className={`tag ${
                                            exercise.isPublished ? "tag--published" : ""
                                        }`}
                                    >
                                        {exercise.isPublished
                                            ? t("admin.exercises.yes")
                                            : t("admin.exercises.no")}
                                    </span>
                                </div>
                                {exercise.createdBy && (
                                    <div className="detail-field">
                                        <span className="detail-field__label">
                                            {t("admin.exercises.detail.fields.creator")}
                                        </span>
                                        <span className="detail-field__value">
                                            {exercise.createdBy.fullName} (
                                            {exercise.createdBy.userEmail})
                                        </span>
                                    </div>
                                )}
                                {exercise.exDescription && (
                                    <div className="detail-field detail-field--full">
                                        <span className="detail-field__label">
                                            {t("admin.exercises.detail.fields.description")}
                                        </span>
                                        <p className="detail-field__text">{exercise.exDescription}</p>
                                    </div>
                                )}
                            </div>

                            {/* ScenarioData viewer */}
                            <div className="detail-field" style={{ marginTop: 16 }}>
                                <span className="detail-field__label">
                                    {t("admin.exercises.detail.fields.scenarioData")}
                                </span>
                                <ScenarioViewer data={exercise.scenarioData} />
                            </div>
                        </div>
                    )}

                    {/* Tab: Sample Solution */}
                    {activeTab === "solution" && (
                        <div className="detail-tab-content">
                            <SampleSolutionEditor
                                exerciseId={exercise.exerciseId}
                                exerciseSource={exercise.exerciseSource}
                            />
                        </div>
                    )}
                </section>
            )}
        </AdminLayout>
    );
};

export default ExerciseDetailPage;
