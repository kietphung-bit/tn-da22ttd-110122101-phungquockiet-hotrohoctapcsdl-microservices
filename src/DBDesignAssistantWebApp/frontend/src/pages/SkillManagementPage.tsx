import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import skillApi from "../services/skillApi";
import type { Skill } from "../types";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../components/layouts/AdminLayout";
import { useTranslation } from "react-i18next";
import { Edit2, Eye, Trash2, Plus, XCircle, CheckCircle } from "lucide-react";
import ConfirmDialog from "../components/common/ConfirmDialog";

type PendingSkillAction = {
    kind: "delete" | "hide" | "show";
    item: Skill;
};

const SkillManagementPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<Skill | null>(null);
    const [pendingSkillAction, setPendingSkillAction] = useState<PendingSkillAction | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        skillName: "",
        skillDescription: "",
        skillCategory: "",
        isActive: true,
    });

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await skillApi.getAll();
            setItems(data);
        } catch {
            setError(t("admin.skills.loadError", "Failed to load skills"));
        } finally {
            setLoading(false);
        }
    }, [t]);

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

    const handleOpenCreate = () => {
        setFormError(null);
        setFormData({
            skillName: "",
            skillDescription: "",
            skillCategory: "",
            isActive: true,
        });
        setIsCreateOpen(true);
    };

    const handleCloseCreate = () => {
        setIsCreateOpen(false);
        setFormError(null);
    };

    const handleOpenEdit = (item: Skill) => {
        setFormError(null);
        setSelectedItem(item);
        setFormData({
            skillName: item.skillName,
            skillDescription: item.skillDescription || "",
            skillCategory: item.skillCategory || "",
            isActive: item.isActive,
        });
        setIsEditOpen(true);
    };

    const handleCloseEdit = () => {
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormError(null);
    };

    const handleOpenDetail = (item: Skill) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedItem(null);
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        if (!formData.skillName.trim()) {
            setFormError(t("admin.skills.form.missingRequired", "Skill name is required"));
            return;
        }

        try {
            const created = await skillApi.create({
                skillName: formData.skillName.trim(),
                skillDescription: formData.skillDescription.trim() || undefined,
                skillCategory: formData.skillCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            setItems((prev) => [created, ...prev]);
            handleCloseCreate();
        } catch {
            setFormError(t("admin.skills.form.createError", "Failed to create item"));
        }
    };

    const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedItem) return;
        setFormError(null);
        if (!formData.skillName.trim()) {
            setFormError(t("admin.skills.form.missingRequired", "Skill name is required"));
            return;
        }

        try {
            const updated = await skillApi.update(selectedItem.skillId, {
                skillName: formData.skillName.trim(),
                skillDescription: formData.skillDescription.trim() || undefined,
                skillCategory: formData.skillCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            setItems((prev) => prev.map(item => item.skillId === updated.skillId ? updated : item));
            handleCloseEdit();
        } catch {
            setFormError(t("admin.skills.form.updateError", "Failed to update item"));
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await skillApi.delete(id);
            loadItems();
        } catch {
            setError(t("admin.skills.deleteError", "Failed to delete item"));
        }
    };

    const requestDelete = (item: Skill) => {
        setPendingSkillAction({ kind: "delete", item });
    };

    const requestToggleActive = (item: Skill) => {
        setPendingSkillAction({ kind: item.isActive ? "hide" : "show", item });
    };

    const handleToggleActive = async (item: Skill) => {
        try {
            const updated = await skillApi.update(item.skillId, {
                skillName: item.skillName,
                skillDescription: item.skillDescription || undefined,
                skillCategory: item.skillCategory || undefined,
                isActive: !item.isActive,
            });
            setItems((prev) => prev.map(s => s.skillId === updated.skillId ? updated : s));
        } catch {
            setError(t("admin.skills.toggleError", "Failed to toggle item visibility"));
        }
    };

    const handleConfirmSkillAction = () => {
        const action = pendingSkillAction;
        if (!action) {
            return;
        }
        setPendingSkillAction(null);
        if (action.kind === "delete") {
            void handleDelete(action.item.skillId);
            return;
        }
        void handleToggleActive(action.item);
    };

    const pendingSkillKind = pendingSkillAction?.kind ?? "delete";
    const pendingSkillVariant =
        pendingSkillKind === "delete" ? "danger" : pendingSkillKind === "hide" ? "warning" : "normal";
    const pendingSkillConfirmLabel =
        pendingSkillKind === "delete"
            ? t("common.delete", "Delete")
            : pendingSkillKind === "hide"
              ? t("common.hide", "Hide")
              : t("common.show", "Show");

    return (
        <AdminLayout
            title={t("sidebar.skills", "Kỹ năng")}
            subtitle={t("admin.skills.subtitle", "Quản lý danh mục kỹ năng thiết kế DB")}
            onSignOut={handleSignOut}
        >
            <ConfirmDialog
                open={Boolean(pendingSkillAction)}
                title={t(`admin.skills.confirmations.${pendingSkillKind}.title`)}
                message={t(`admin.skills.confirmations.${pendingSkillKind}.message`)}
                confirmLabel={pendingSkillConfirmLabel}
                cancelLabel={t("common.cancel", "Cancel")}
                variant={pendingSkillVariant}
                onCancel={() => setPendingSkillAction(null)}
                onConfirm={handleConfirmSkillAction}
            />
            {error && <div className="alert">{error}</div>}
            
            {/* Create Modal */}
            {isCreateOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.skills.create", "Thêm kỹ năng")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseCreate}>✕</button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleCreate} className="stagger">
                            <div className="form-field">
                                <label>{t("admin.skills.skillName", "Tên kỹ năng")} *</label>
                                <input className="input" type="text" value={formData.skillName} onChange={(e) => setFormData(prev => ({...prev, skillName: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.skills.skillCategory", "Danh mục")}</label>
                                <input className="input" type="text" value={formData.skillCategory} onChange={(e) => setFormData(prev => ({...prev, skillCategory: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.skills.skillDescription", "Mô tả")}</label>
                                <textarea className="input" rows={3} value={formData.skillDescription} onChange={(e) => setFormData(prev => ({...prev, skillDescription: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))} />
                                    <span style={{ marginLeft: 8 }}>{t("admin.skills.status.active", "Hiển thị")}</span>
                                </label>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-primary">{t("common.save", "Lưu")}</button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseCreate}>{t("common.cancel", "Hủy")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditOpen && selectedItem && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.skills.edit", "Sửa kỹ năng")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseEdit}>✕</button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleEdit} className="stagger">
                            <div className="form-field">
                                <label>{t("admin.skills.skillName", "Tên kỹ năng")} *</label>
                                <input className="input" type="text" value={formData.skillName} onChange={(e) => setFormData(prev => ({...prev, skillName: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.skills.skillCategory", "Danh mục")}</label>
                                <input className="input" type="text" value={formData.skillCategory} onChange={(e) => setFormData(prev => ({...prev, skillCategory: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.skills.skillDescription", "Mô tả")}</label>
                                <textarea className="input" rows={3} value={formData.skillDescription} onChange={(e) => setFormData(prev => ({...prev, skillDescription: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))} />
                                    <span style={{ marginLeft: 8 }}>{t("admin.skills.status.active", "Hiển thị")}</span>
                                </label>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-primary">{t("common.save", "Lưu")}</button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseEdit}>{t("common.cancel", "Hủy")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {isDetailOpen && selectedItem && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.skills.detail", "Chi tiết kỹ năng")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseDetail}>✕</button>
                        </div>
                        <div className="stagger">
                            <p><strong>{t("admin.skills.skillName", "Tên kỹ năng")}:</strong> {selectedItem.skillName}</p>
                            <p><strong>{t("admin.skills.skillCategory", "Danh mục")}:</strong> {selectedItem.skillCategory || "-"}</p>
                            <p><strong>{t("common.status", "Trạng thái")}:</strong> <span className="tag">{selectedItem.isActive ? t("admin.skills.status.active", "Hiển thị") : t("admin.skills.status.inactive", "Ẩn")}</span></p>
                            <p><strong>{t("admin.skills.skillDescription", "Mô tả")}:</strong> {selectedItem.skillDescription || "-"}</p>
                        </div>
                    </div>
                </div>
            )}

            <section className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                    <div></div>
                    <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                        <Plus size={12} /> {t("admin.skills.create", "Thêm kỹ năng")}
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
                                    <th>{t("admin.skills.skillName", "Tên kỹ năng")}</th>
                                    <th>{t("admin.skills.skillCategory", "Danh mục")}</th>
                                    <th>{t("common.status", "Trạng thái")}</th>
                                    <th>{t("common.actions", "Thao tác")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.skillId}>
                                        <td>{item.skillId}</td>
                                        <td>{item.skillName}</td>
                                        <td>{item.skillCategory || "-"}</td>
                                        <td>
                                            <span className="tag">{item.isActive ? t("admin.skills.status.active", "Hiển thị") : t("admin.skills.status.inactive", "Ẩn")}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                
                                                <button type="button" className="btn btn-icon" onClick={() => handleOpenDetail(item)} title={t("common.view", "Xem")}>
                                                    <Eye size={18} />
                                                </button>
                                                
                                                <button type="button" className="btn btn-icon" onClick={() => handleOpenEdit(item)} title={t("common.edit", "Sửa")}>
                                                    <Edit2 size={18} />
                                                </button>
                                                <button type="button" className="btn btn-icon" onClick={() => requestToggleActive(item)} title={item.isActive ? t("common.hide", "Ẩn") : t("common.show", "Hiện")}>
                                                    {item.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                </button>
                                                <button type="button" className="btn btn-icon btn-danger" onClick={() => requestDelete(item)} title={t("common.delete", "Xóa")}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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

export default SkillManagementPage;
