import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Submission } from "../../types";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";

const StudentSubmissionHistoryPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await studentSubmissionApi.getAll();
            setSubmissions(data);
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchSubmissions();
        };
        init();
    }, [fetchSubmissions]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <StudentLayout title="Lịch sử Nộp bài" onSignOut={handleSignOut}>
            <div className="page-header">
                <h2>Lịch sử Nộp bài</h2>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="section-card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mã BT</th>
                                <th>Tiêu đề BT</th>
                                <th>Trạng thái</th>
                                <th>Ngày tạo</th>
                                <th>Ngày nộp</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center">
                                        Không có lịch sử nộp bài
                                    </td>
                                </tr>
                            ) : (
                                submissions.map((sub) => (
                                    <tr key={sub.submissionId}>
                                        <td>{sub.submissionId}</td>
                                        <td>{sub.exerciseCode}</td>
                                        <td>{sub.exerciseTitle}</td>
                                        <td>
                                            <span className={`tag ${sub.submissionStatus === 'DRAFT' ? 'tag--ai' : 'tag--published'}`}>
                                                {sub.submissionStatus}
                                            </span>
                                        </td>
                                        <td>{sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "-"}</td>
                                        <td>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "-"}</td>
                                        <td>
                                            <div className="action-group">
                                                {sub.submissionStatus === "DRAFT" ? (
                                                    <button
                                                        onClick={() => navigate(`/student/workspace/${sub.submissionId}`)}
                                                        className="btn btn-sm btn-outline"
                                                    >
                                                        Tiếp tục làm bài
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/student/submissions/${sub.submissionId}`)}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        Xem chi tiết
                                                    </button>
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

export default StudentSubmissionHistoryPage;
