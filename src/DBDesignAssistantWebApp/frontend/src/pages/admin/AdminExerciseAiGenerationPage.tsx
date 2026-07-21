import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import AdminLayout from "../../components/layouts/AdminLayout";
import ExerciseAiReviewPanel from "../../components/exercises/ExerciseAiReviewPanel";
import { useAuth } from "../../hooks/useAuth";
import exerciseApi from "../../services/exerciseApi";

const AdminExerciseAiGenerationPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();

    const loadAiBaseExercises = useCallback(() => {
        return exerciseApi.getExercises({
            exerciseSource: "MANUAL",
            isPublished: true,
        });
    }, []);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <AdminLayout
            title={t("admin.exercises.aiReview.pageTitle")}
            subtitle={t("admin.exercises.aiReview.pageSubtitle")}
            onSignOut={handleSignOut}
        >
            <div className="ai-review-toolbar">
                <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ paddingLeft: 0, fontWeight: 500 }}
                    onClick={() => navigate("/admin/exercises")}
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    {t("admin.exercises.aiReview.backToList")}
                </button>
            </div>
            <ExerciseAiReviewPanel
                loadBaseExercises={loadAiBaseExercises}
                generateExercise={exerciseApi.generateAiExercise}
                approveExercise={exerciseApi.approveAiExercise}
                rejectExercise={exerciseApi.rejectAiExercise}
                onExerciseChanged={() => undefined}
            />
        </AdminLayout>
    );
};

export default AdminExerciseAiGenerationPage;
