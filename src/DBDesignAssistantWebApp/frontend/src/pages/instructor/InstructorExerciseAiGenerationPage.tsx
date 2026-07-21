import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import ExerciseAiReviewPanel from "../../components/exercises/ExerciseAiReviewPanel";
import { useAuth } from "../../hooks/useAuth";
import { instructorExerciseApi } from "../../services/instructorExerciseApi";

const InstructorExerciseAiGenerationPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();

    const loadAiBaseExercises = useCallback(async () => {
        const data = await instructorExerciseApi.getAll({ isPublished: true });
        return data.filter(
            (exercise) => exercise.exerciseSource !== "AI_GENERATED" && exercise.isPublished,
        );
    }, []);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <InstructorLayout
            title={t("admin.exercises.aiReview.pageTitle")}
            subtitle={t("admin.exercises.aiReview.pageSubtitle")}
            onSignOut={handleSignOut}
        >
            <div className="ai-review-toolbar">
                <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ paddingLeft: 0, fontWeight: 500 }}
                    onClick={() => navigate("/instructor/exercises")}
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    {t("admin.exercises.aiReview.backToList")}
                </button>
            </div>
            <ExerciseAiReviewPanel
                loadBaseExercises={loadAiBaseExercises}
                generateExercise={instructorExerciseApi.generate}
                approveExercise={instructorExerciseApi.approve}
                rejectExercise={instructorExerciseApi.reject}
                onExerciseChanged={() => undefined}
            />
        </InstructorLayout>
    );
};

export default InstructorExerciseAiGenerationPage;
