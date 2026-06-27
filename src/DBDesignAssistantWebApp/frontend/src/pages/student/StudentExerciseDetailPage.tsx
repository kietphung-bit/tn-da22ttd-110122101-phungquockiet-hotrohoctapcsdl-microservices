import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Exercise } from "../../types";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import ScenarioViewer from "../../components/viewers/ScenarioViewer";

const StudentExerciseDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchExercise = async (exId: number) => {
            try {
                setLoading(true);
                const data = await studentExerciseApi.getById(exId);
                setExercise(data);
            } catch (error) {
                console.error("Failed to fetch exercise details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExercise(Number(id));
    }, [id]);

    const handleStartDraft = async () => {
        if (!exercise) return;
        try {
            setSubmitting(true);
            const draft = await studentSubmissionApi.createDraft(exercise.exerciseId);
            navigate(`/student/workspace/${draft.submissionId}`);
        } catch (error) {
            console.error("Failed to create draft:", error);
            alert("Không thể tạo bản nháp. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    if (loading) return <StudentLayout title="Loading..." onSignOut={handleSignOut}><div>Loading...</div></StudentLayout>;
    if (!exercise) return <StudentLayout title="Not Found" onSignOut={handleSignOut}><div>Exercise not found.</div></StudentLayout>;

    return (
        <StudentLayout title={`Chi tiết Bài tập: ${exercise.exTitle}`} onSignOut={handleSignOut}>
            <div className="page-header">
                <h2>Chi tiết Bài tập: {exercise.exTitle}</h2>
                <button
                    onClick={() => navigate("/student/exercises")}
                    className="btn btn-outline"
                >
                    Quay lại
                </button>
            </div>

            <div className="section-card mb-4">
                <div className="card-body">
                    <p><strong>Mã bài tập:</strong> {exercise.exerciseCode}</p>
                    <p><strong>Nguồn:</strong> {exercise.exerciseSource}</p>
                    <div>
                        <strong>Mô tả:</strong>
                        <div className="mt-2 p-3 bg-light rounded" style={{ backgroundColor: "var(--surface-sunken)", padding: "16px", borderRadius: "8px", marginTop: "8px" }}>
                            {exercise.exDescription || "Không có mô tả."}
                        </div>
                    </div>
                    <div className="mt-4" style={{ marginTop: "16px" }}>
                        <strong>Dữ liệu kịch bản (Scenario Data):</strong>
                        <div style={{ marginTop: "8px" }}>
                            <ScenarioViewer data={exercise.scenarioData} />
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                <button
                    className="btn btn-primary"
                    style={{ fontSize: "1.1rem", padding: "12px 24px" }}
                    onClick={handleStartDraft}
                    disabled={submitting}
                >
                    {submitting ? "Đang tạo bản nháp..." : "Bắt đầu làm bài"}
                </button>
            </div>
        </StudentLayout>
    );
};

export default StudentExerciseDetailPage;
