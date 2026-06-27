import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import knowledgeBaseApi from "../services/knowledgeBaseApi";
import type { KnowledgeBase } from "../types";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../components/layouts/AdminLayout";
import { useTranslation } from "react-i18next";
import { Edit2, Eye, Trash2, Plus, XCircle, CheckCircle, Check, X } from "lucide-react";

const KnowledgeBaseManagementPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<KnowledgeBase | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("");

    const [formData, setFormData] = useState({
        kbTitle: "",
        kbContent: "",
        kbSource: "",
        kbCategory: "",
        isActive: true,
    });

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await knowledgeBaseApi.getAll(filterStatus || undefined);
            setItems(data);
        } catch {
            setError(t("admin.knowledgeBase.loadError", "Failed to load knowledge base items"));
        } finally {
            setLoading(false);
        }
    }, [t, filterStatus]);

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
            kbTitle: "",
            kbContent: "",
            kbSource: "",
            kbCategory: "",
            isActive: true,
        });
        setIsCreateOpen(true);
    };

    const handleCloseCreate = () => {
        setIsCreateOpen(false);
        setFormError(null);
    };

    const handleOpenEdit = (item: KnowledgeBase) => {
        setFormError(null);
        setSelectedItem(item);
        setFormData({
            kbTitle: item.kbTitle,
            kbContent: item.kbContent,
            kbSource: item.kbSource || "",
            kbCategory: item.kbCategory || "",
            isActive: item.isActive,
        });
        setIsEditOpen(true);
    };

    const handleCloseEdit = () => {
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormError(null);
    };

    const handleOpenDetail = (item: KnowledgeBase) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedItem(null);
    };

    const handleOpenReject = (item: KnowledgeBase) => {
        setSelectedItem(item);
        setRejectNote("");
        setIsRejectOpen(true);
    };

    const handleCloseReject = () => {
        setIsRejectOpen(false);
        setSelectedItem(null);
        setRejectNote("");
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        if (!formData.kbTitle.trim() || !formData.kbContent.trim()) {
            setFormError(t("admin.knowledgeBase.form.missingRequired", "Title and content are required"));
            return;
        }

        try {
            const created = await knowledgeBaseApi.create({
                kbTitle: formData.kbTitle.trim(),
                kbContent: formData.kbContent.trim(),
                kbSource: formData.kbSource.trim() || undefined,
                kbCategory: formData.kbCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            if (!filterStatus || filterStatus === created.approvalStatus) {
                setItems((prev) => [created, ...prev]);
            }
            handleCloseCreate();
        } catch {
            setFormError(t("admin.knowledgeBase.form.createError", "Failed to create item"));
        }
    };

    const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedItem) return;
        setFormError(null);
        if (!formData.kbTitle.trim() || !formData.kbContent.trim()) {
            setFormError(t("admin.knowledgeBase.form.missingRequired", "Title and content are required"));
            return;
        }

        try {
            const updated = await knowledgeBaseApi.update(selectedItem.kbId, {
                kbTitle: formData.kbTitle.trim(),
                kbContent: formData.kbContent.trim(),
                kbSource: formData.kbSource.trim() || undefined,
                kbCategory: formData.kbCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            setItems((prev) => prev.map(item => item.kbId === updated.kbId ? updated : item));
            handleCloseEdit();
        } catch {
            setFormError(t("admin.knowledgeBase.form.updateError", "Failed to update item"));
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t("admin.knowledgeBase.confirmDelete", "Are you sure you want to delete this item?"))) {
            return;
        }
        try {
            await knowledgeBaseApi.delete(id);
            setItems(prev => prev.filter(item => item.kbId !== id));
        } catch {
            setError(t("admin.knowledgeBase.deleteError", "Failed to delete item"));
        }
    };

    const handleToggleActive = async (item: KnowledgeBase) => {
        const confirmMessage = item.isActive 
            ? t("admin.knowledgeBase.confirmHide", "Are you sure you want to hide this item?") 
            : t("admin.knowledgeBase.confirmShow", "Are you sure you want to show this item?");
        if (!window.confirm(confirmMessage)) {
            return;
        }
        try {
            const updated = await knowledgeBaseApi.update(item.kbId, {
                kbTitle: item.kbTitle,
                kbContent: item.kbContent,
                kbSource: item.kbSource || undefined,
                kbCategory: item.kbCategory || undefined,
                isActive: !item.isActive,
            });
            setItems((prev) => prev.map(kb => kb.kbId === updated.kbId ? updated : kb));
        } catch {
            setError(t("admin.knowledgeBase.toggleError", "Failed to toggle item visibility"));
        }
    };

    const handleApprove = async (id: number) => {
        if (!window.confirm(t("admin.knowledgeBase.confirmApprove", "Are you sure you want to approve this item?"))) return;
        try {
            const updated = await knowledgeBaseApi.approve(id);
            setItems((prev) => prev.map(item => item.kbId === updated.kbId ? updated : item));
        } catch {
            setError(t("admin.knowledgeBase.approveError", "Failed to approve item"));
        }
    };

    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
            const updated = await knowledgeBaseApi.reject(selectedItem.kbId, rejectNote);
            setItems((prev) => prev.map(item => item.kbId === updated.kbId ? updated : item));
            handleCloseReject();
        } catch {
            setError(t("admin.knowledgeBase.rejectError", "Failed to reject item"));
        }
    };

    return (
        <AdminLayout
            title={t("admin.knowledgeBase.title")}
            subtitle={t("admin.knowledgeBase.subtitle", "Quản lý dữ liệu kiến thức cho Chatbot")}
            onSignOut={handleSignOut}
        >
            {error && <div className="alert">{error}</div>}
            
            {/* Create Modal */}
            {isCreateOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.knowledgeBase.create", "Thêm học liệu")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseCreate}>✕</button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleCreate} className="stagger">
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")} *</label>
                                <input className="input" type="text" value={formData.kbTitle} onChange={(e) => setFormData(prev => ({...prev, kbTitle: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbCategory", "Danh mục")}</label>
                                <input className="input" type="text" value={formData.kbCategory} onChange={(e) => setFormData(prev => ({...prev, kbCategory: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbSource", "Nguồn")}</label>
                                <input className="input" type="text" value={formData.kbSource} onChange={(e) => setFormData(prev => ({...prev, kbSource: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbContent", "Nội dung")} *</label>
                                <textarea className="input" rows={6} value={formData.kbContent} onChange={(e) => setFormData(prev => ({...prev, kbContent: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))} />
                                    <span style={{ marginLeft: 8 }}>{t("admin.knowledgeBase.status.active", "Hiển thị")}</span>
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
                            <h2>{t("admin.knowledgeBase.edit", "Sửa học liệu")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseEdit}>✕</button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleEdit} className="stagger">
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")} *</label>
                                <input className="input" type="text" value={formData.kbTitle} onChange={(e) => setFormData(prev => ({...prev, kbTitle: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbCategory", "Danh mục")}</label>
                                <input className="input" type="text" value={formData.kbCategory} onChange={(e) => setFormData(prev => ({...prev, kbCategory: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbSource", "Nguồn")}</label>
                                <input className="input" type="text" value={formData.kbSource} onChange={(e) => setFormData(prev => ({...prev, kbSource: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.kbContent", "Nội dung")} *</label>
                                <textarea className="input" rows={6} value={formData.kbContent} onChange={(e) => setFormData(prev => ({...prev, kbContent: e.target.value}))} />
                            </div>
                            <div className="form-field">
                                <label>
                                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))} />
                                    <span style={{ marginLeft: 8 }}>{t("admin.knowledgeBase.status.active", "Hiển thị")}</span>
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

            {/* Reject Modal */}
            {isRejectOpen && selectedItem && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.knowledgeBase.reject", "Từ chối học liệu")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseReject}>✕</button>
                        </div>
                        <form onSubmit={handleReject} className="stagger">
                            <div className="form-field">
                                <label>{t("admin.knowledgeBase.reviewNote", "Lý do từ chối")} *</label>
                                <textarea className="input" required rows={4} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-danger">{t("common.reject", "Từ chối")}</button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseReject}>{t("common.cancel", "Hủy")}</button>
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
                            <h2>{t("admin.knowledgeBase.detail", "Chi tiết học liệu")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseDetail}>✕</button>
                        </div>
                        <div className="stagger" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <p><strong>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")}:</strong> {selectedItem.kbTitle}</p>
                            <p><strong>{t("admin.knowledgeBase.scope", "Phạm vi")}:</strong> <span className="tag">{selectedItem.knowledgeScope}</span></p>
                            <p><strong>{t("admin.knowledgeBase.approvalStatus", "Trạng thái duyệt")}:</strong> <span className={`tag ${selectedItem.approvalStatus === 'APPROVED' ? 'text-success' : selectedItem.approvalStatus === 'REJECTED' ? 'text-danger' : ''}`}>{selectedItem.approvalStatus}</span></p>
                            <p><strong>{t("admin.knowledgeBase.createdBy", "Người tạo")}:</strong> {selectedItem.createdByName || 'SYSTEM'}</p>
                            {selectedItem.reviewNote && (
                                <p><strong>{t("admin.knowledgeBase.reviewNote", "Lý do từ chối")}:</strong> <span className="text-danger">{selectedItem.reviewNote}</span></p>
                            )}
                            <p><strong>{t("admin.knowledgeBase.kbCategory", "Danh mục")}:</strong> {selectedItem.kbCategory || "-"}</p>
                            <p><strong>{t("admin.knowledgeBase.kbSource", "Nguồn")}:</strong> {selectedItem.kbSource || "-"}</p>
                            <p><strong>{t("common.status", "Trạng thái")}:</strong> <span className="tag">{selectedItem.isActive ? t("admin.knowledgeBase.status.active", "Hiển thị") : t("admin.knowledgeBase.status.inactive", "Ẩn")}</span></p>
                            <div>
                                <strong>{t("admin.knowledgeBase.kbContent", "Nội dung")}:</strong>
                                <div style={{ marginTop: 8, padding: 12, background: "var(--surface-sunken)", borderRadius: 8, whiteSpace: "pre-wrap" }}>
                                    {selectedItem.kbContent}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select className="input" style={{ width: 200 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">{t("admin.knowledgeBase.filter.all", "Tất cả")}</option>
                            <option value="SUBMITTED">{t("admin.knowledgeBase.filter.pending", "Chờ duyệt")}</option>
                            <option value="APPROVED">{t("admin.knowledgeBase.filter.approved", "Đã duyệt")}</option>
                        </select>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                        <Plus size={12} /> {t("admin.knowledgeBase.create", "Thêm học liệu")}
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
                                    <th>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")}</th>
                                    <th>{t("admin.knowledgeBase.createdBy", "Nguồn / Tác giả")}</th>
                                    <th>{t("admin.knowledgeBase.approvalStatus", "Kiểm duyệt")}</th>
                                    <th>{t("common.status", "Trạng thái")}</th>
                                    <th>{t("common.actions", "Thao tác")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.kbId}>
                                        <td>{item.kbId}</td>
                                        <td>{item.kbTitle}</td>
                                        <td>
                                            {item.knowledgeScope === 'SYSTEM' ? (
                                                <span className="tag">SYSTEM</span>
                                            ) : (
                                                <span>{item.createdByName || 'Instructor'}</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`tag ${item.approvalStatus === 'APPROVED' ? 'text-success' : item.approvalStatus === 'REJECTED' ? 'text-danger' : item.approvalStatus === 'SUBMITTED' ? 'text-primary' : ''}`}>
                                                {item.approvalStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="tag">{item.isActive ? t("admin.knowledgeBase.status.active", "Hiển thị") : t("admin.knowledgeBase.status.inactive", "Ẩn")}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button type="button" className="btn btn-icon" onClick={() => handleOpenDetail(item)} title={t("common.view", "Xem")}>
                                                    <Eye size={18} />
                                                </button>
                                                
                                                {item.approvalStatus === 'SUBMITTED' && (
                                                    <>
                                                        <button type="button" className="btn btn-icon" style={{ color: "var(--success)" }} onClick={() => handleApprove(item.kbId)} title={t("common.approve", "Duyệt")}>
                                                            <Check size={18} />
                                                        </button>
                                                        <button type="button" className="btn btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleOpenReject(item)} title={t("common.reject", "Từ chối")}>
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                )}

                                                {item.knowledgeScope === 'SYSTEM' && (
                                                    <>
                                                        <button type="button" className="btn btn-icon" onClick={() => handleOpenEdit(item)} title={t("common.edit", "Sửa")}>
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button type="button" className="btn btn-icon" onClick={() => handleToggleActive(item)} title={item.isActive ? t("common.hide", "Ẩn") : t("common.show", "Hiện")}>
                                                            {item.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                                        </button>
                                                        <button type="button" className="btn btn-icon btn-danger" onClick={() => handleDelete(item.kbId)} title={t("common.delete", "Xóa")}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
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

export default KnowledgeBaseManagementPage;
