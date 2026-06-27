import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReadOnlyErdViewer from "../../components/viewers/ReadOnlyErdViewer";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Submission } from "../../types";

const StudentSubmissionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchSubmission = async (subId: number) => {
            try {
                setLoading(true);
                const data = await studentSubmissionApi.getById(subId);
                setSubmission(data);
            } catch (error) {
                console.error("Failed to fetch submission details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmission(Number(id));
    }, [id]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    if (loading) {
        return (
            <StudentLayout title="Đang tải..." onSignOut={handleSignOut}>
                <div>Đang tải...</div>
            </StudentLayout>
        );
    }

    if (!submission) {
        return (
            <StudentLayout title="Không tìm thấy" onSignOut={handleSignOut}>
                <div>Không tìm thấy bài nộp.</div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout title={`Chi tiết bài nộp: ${submission.exerciseTitle}`} onSignOut={handleSignOut}>
            <div className="page-header">
                <h2>Chi tiết bài nộp: {submission.exerciseTitle}</h2>
                <button
                    onClick={() => navigate("/student/submissions")}
                    className="btn btn-outline"
                >
                    Quay lại
                </button>
            </div>

            <div className="section-card mb-4">
                <div className="card-body" style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 240px" }}>
                        <p><strong>Mã bài tập:</strong> {submission.exerciseCode}</p>
                        <p style={{ marginTop: "8px" }}>
                            <strong>Trạng thái:</strong>{" "}
                            <span className={`tag ${submission.submissionStatus === "DRAFT" ? "tag--ai" : "tag--published"}`}>
                                {submission.submissionStatus}
                            </span>
                        </p>
                    </div>
                    <div style={{ flex: "1 1 240px" }}>
                        <p><strong>Ngày tạo:</strong> {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "-"}</p>
                        <p style={{ marginTop: "8px" }}>
                            <strong>Ngày nộp:</strong> {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "-"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="section-card mb-4">
                <h3 style={{ margin: 0, marginBottom: "16px" }}>Sơ đồ bài làm</h3>
                <ReadOnlyErdViewer data={submission.diagramData} />
            </div>

            <div className="section-card">
                <h3 style={{ margin: 0, marginBottom: "16px" }}>Kết quả đánh giá AI</h3>
                {submission.evaluation ? (
                    <div>
                        <p>
                            <strong>Điểm tổng quan:</strong>{" "}
                            <span className="tag tag--published" style={{ fontSize: "1.1rem", padding: "4px 8px" }}>
                                {submission.evaluation.overallScore}/100
                            </span>
                        </p>
                        <p style={{ marginTop: "8px" }}>
                            <strong>Thời gian chấm:</strong>{" "}
                            {submission.evaluation.evaluatedAt ? new Date(submission.evaluation.evaluatedAt).toLocaleString() : "-"}
                        </p>

                        <h4 className="mt-4" style={{ marginTop: "24px", marginBottom: "16px" }}>Chi tiết lỗi:</h4>
                        {submission.evaluation.details && submission.evaluation.details.length > 0 ? (
                            <table className="table mt-2">
                                <thead>
                                    <tr>
                                        <th>Loại lỗi</th>
                                        <th>Mô tả</th>
                                        <th>Vị trí</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submission.evaluation.details.map((detail, index) => (
                                        <tr key={detail.detailId ?? index}>
                                            <td>
                                                <span className="tag" style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                                                    {detail.errorType}
                                                </span>
                                            </td>
                                            <td>{detail.evaDescription}</td>
                                            <td>{detail.errorLocation || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--ink-soft)" }}>Không tìm thấy lỗi nào. Chúc mừng bạn!</p>
                        )}
                    </div>
                ) : (
                    <p style={{ color: "var(--ink-soft)" }}>Chưa có kết quả đánh giá cho bài nộp này.</p>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentSubmissionDetailPage;
