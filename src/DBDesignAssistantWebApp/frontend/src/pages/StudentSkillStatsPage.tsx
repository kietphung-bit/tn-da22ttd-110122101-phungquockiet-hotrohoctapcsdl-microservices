import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import studentSkillStatsApi from "../services/studentSkillStatsApi";
import type { StudentSkillStats } from "../types";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../components/layouts/AdminLayout";
import { useTranslation } from "react-i18next";
import { BarChart3, Eye, Info } from "lucide-react";

const StudentSkillStatsPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState<StudentSkillStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StudentSkillStats | null>(null);
    const [filterStudentId, setFilterStudentId] = useState("");
    const [filterSkillId, setFilterSkillId] = useState("");

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: Record<string, number> = {};
            if (filterStudentId) filters.studentId = Number(filterStudentId);
            if (filterSkillId) filters.skillId = Number(filterSkillId);

            const data = await studentSkillStatsApi.getStats(filters);
            setItems(data);
        } catch {
            setError(t("admin.studentSkillStats.loadError", "Failed to load stats"));
        } finally {
            setLoading(false);
        }
    }, [filterStudentId, filterSkillId, t]);

    useEffect(() => {
        const init = async () => {
            await loadItems();
        };
        init();
    }, [loadItems]);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const handleOpenDetail = (item: StudentSkillStats) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedItem(null);
    };

    const renderProficiencyBar = (level: number) => {
        // Assume level is out of 100
        let color = "var(--danger)";
        if (level >= 80) color = "var(--success)";
        else if (level >= 50) color = "var(--warning)";

        return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 150 }}>
                <div style={{ flex: 1, height: 8, background: "var(--surface-sunken)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${level}%`, height: "100%", background: color }} />
                </div>
                <span style={{ fontSize: "0.85rem", minWidth: 35 }}>{level.toFixed(1)}%</span>
            </div>
        );
    };

    return (
        <AdminLayout
            title={t("sidebar.studentSkillStats", "Thống kê kỹ năng")}
            subtitle={t("admin.studentSkillStats.subtitle", "Thống kê năng lực sinh viên (Chỉ xem)")}
            onSignOut={handleSignOut}
        >
            {error && <div className="alert">{error}</div>}

            <section className="section-card" style={{ borderLeft: "4px solid var(--warning)", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <Info size={20} style={{ color: "var(--warning)", marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: "1rem" }}>
                            {t(
                                "admin.studentSkillStats.legacyNoticeTitle",
                                "Ch\u1ee9c n\u0103ng d\u1ef1 ki\u1ebfn, kh\u00f4ng ph\u1ea3i th\u1ed1ng k\u00ea demo ch\u00ednh"
                            )}
                        </h2>
                        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
                            {t(
                                "admin.studentSkillStats.legacyNoticeBody",
                                "C\u00e1c d\u00f2ng n\u00e0y \u0111\u1ebfn t\u1eeb StudentSkillStats legacy/seeded. Lu\u1ed3ng production hi\u1ec7n ghi t\u00edn hi\u1ec7u ch\u1ea5m b\u00e0i th\u1eadt v\u00e0o EvaluationRounds, n\u00ean khi b\u1ea3o v\u1ec7 h\u00e3y d\u00f9ng Practice Insights."
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate("/admin/practice-insights")}
                    >
                        <BarChart3 size={16} />
                        {t("admin.studentSkillStats.openPracticeInsights", "M\u1edf Practice Insights")}
                    </button>
                </div>
            </section>

            {/* Detail Modal */}
            {isDetailOpen && selectedItem && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.studentSkillStats.detail", "Chi tiết thống kê")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseDetail}>✕</button>
                        </div>
                        <div className="stagger">
                            <p><strong>{t("admin.studentSkillStats.studentName", "Sinh viên")}:</strong> {selectedItem.studentName} (ID: {selectedItem.studentId})</p>
                            <p><strong>{t("admin.studentSkillStats.skillName", "Kỹ năng")}:</strong> {selectedItem.skillName} (ID: {selectedItem.skillId})</p>
                            <p><strong>{t("admin.studentSkillStats.attemptCount", "Số lần thử")}:</strong> {selectedItem.attemptCount}</p>
                            <p><strong>{t("admin.studentSkillStats.lastEvaluatedAt", "Lần đánh giá cuối")}:</strong> {selectedItem.lastEvaluatedAt ? new Date(selectedItem.lastEvaluatedAt).toLocaleString() : "-"}</p>
                            <div>
                                <strong>{t("admin.studentSkillStats.proficiencyLevel", "Mức độ thành thạo")}:</strong>
                                <div style={{ marginTop: 8 }}>
                                    {renderProficiencyBar(selectedItem.proficiencyLevel)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="section-card">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "flex-end" }}>
                    <div className="form-field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                        <label>{t("admin.studentSkillStats.filterStudent", "Lọc theo ID sinh viên")}</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="Student ID..."
                            value={filterStudentId}
                            onChange={(e) => setFilterStudentId(e.target.value)}
                        />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                        <label>{t("admin.studentSkillStats.filterSkill", "Lọc theo ID kỹ năng")}</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="Skill ID..."
                            value={filterSkillId}
                            onChange={(e) => setFilterSkillId(e.target.value)}
                        />
                    </div>
                    <button type="button" className="btn btn-outline" onClick={() => { setFilterStudentId(""); setFilterSkillId(""); }}>
                        {t("common.clearFilter", "Xóa bộ lọc")}
                    </button>
                </div>

                {loading ? (
                    <p>{t("common.loading", "Đang tải...")}</p>
                ) : items.length === 0 ? (
                    <p>{t("common.empty", "Không có dữ liệu")}</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{t("admin.studentSkillStats.studentName", "Sinh viên")}</th>
                                    <th>{t("admin.studentSkillStats.skillName", "Kỹ năng")}</th>
                                    <th>{t("admin.studentSkillStats.proficiencyLevel", "Thành thạo")}</th>
                                    <th>{t("admin.studentSkillStats.attemptCount", "Số lần")}</th>
                                    <th>{t("common.actions", "Thao tác")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.statsId}>
                                        <td>{item.statsId}</td>
                                        <td>{item.studentName}</td>
                                        <td>{item.skillName}</td>
                                        <td>{renderProficiencyBar(item.proficiencyLevel)}</td>
                                        <td>{item.attemptCount}</td>
                                        <td>
                                            <button type="button" className="btn btn-icon" onClick={() => handleOpenDetail(item)} title={t("common.view", "Xem")}>
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </AdminLayout>
    );
};

export default StudentSkillStatsPage;
