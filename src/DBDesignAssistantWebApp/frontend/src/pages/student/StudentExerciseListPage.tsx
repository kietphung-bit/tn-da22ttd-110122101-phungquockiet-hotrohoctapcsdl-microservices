import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import type { Exercise } from "../../types";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";

const StudentExerciseListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const fetchExercises = useCallback(async (query: string) => {
        try {
            setLoading(true);
            const data = await studentExerciseApi.getAll({ search: query });
            setExercises(data);
        } catch (error) {
            console.error("Failed to fetch exercises:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await fetchExercises("");
        };
        init();
    }, [fetchExercises]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchExercises(search);
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <StudentLayout title={t("admin.sidebar.exercises", "Bài tập")} onSignOut={handleSignOut}>
            <div className="page-header">
                <h2>{t("admin.sidebar.exercises", "Bài tập")}</h2>
                <form onSubmit={handleSearch} className="search-bar" style={{ display: "flex", gap: "8px" }}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài tập..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                    />
                    <button type="submit" className="btn btn-primary">Tìm kiếm</button>
                </form>
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
                                <th>Tiêu đề</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exercises.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center">
                                        Không có bài tập nào
                                    </td>
                                </tr>
                            ) : (
                                exercises.map((ex) => (
                                    <tr key={ex.exerciseId}>
                                        <td>{ex.exerciseId}</td>
                                        <td>{ex.exerciseCode}</td>
                                        <td>{ex.exTitle}</td>
                                        <td>
                                            <div className="action-group">
                                                <button
                                                    onClick={() => navigate(`/student/exercises/${ex.exerciseId}`)}
                                                    className="btn btn-outline"
                                                >
                                                    Xem chi tiết
                                                </button>
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

export default StudentExerciseListPage;
