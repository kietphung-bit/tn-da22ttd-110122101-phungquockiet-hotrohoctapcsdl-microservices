import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import instructorKnowledgeBaseApi from "../../services/instructorKnowledgeBaseApi";
import type { KnowledgeBase } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import InstructorLayout from "../../components/layouts/InstructorLayout";
import { useTranslation } from "react-i18next";
import { Edit2, Eye, Trash2, Plus, Send } from "lucide-react";

const InstructorKnowledgeBasePage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<"my" | "system">("my");
    const [myItems, setMyItems] = useState<KnowledgeBase[]>([]);
    const [systemItems, setSystemItems] = useState<KnowledgeBase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<KnowledgeBase | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        kbTitle: "",
        kbContent: "",
        kbSource: "",
        kbCategory: "",
        isActive: true,
    });

    const loadMyItems = useCallback(async () => {
        try {
            const data = await instructorKnowledgeBaseApi.getMyKnowledge();
            setMyItems(data);
        } catch {
            setError(t("instructor.knowledgeBase.loadError", "Failed to load your knowledge base items"));
        }
    }, [t]);

    const loadSystemItems = useCallback(async () => {
        try {
            const data = await instructorKnowledgeBaseApi.getSystemKnowledge();
            setSystemItems(data);
        } catch {
            setError(t("instructor.knowledgeBase.loadError", "Failed to load system knowledge base items"));
        }
    }, [t]);

    useEffect(() => {
        let isCancelled = false;
        const loadData = async () => {
            await Promise.all([loadMyItems(), loadSystemItems()]);
            if (!isCancelled) setLoading(false);
        };
        loadData();
        return () => {
            isCancelled = true;
        };
    }, [loadMyItems, loadSystemItems]);

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

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        if (!formData.kbTitle.trim() || !formData.kbContent.trim()) {
            setFormError(t("admin.knowledgeBase.form.missingRequired", "Title and content are required"));
            return;
        }

        try {
            const created = await instructorKnowledgeBaseApi.create({
                kbTitle: formData.kbTitle.trim(),
                kbContent: formData.kbContent.trim(),
                kbSource: formData.kbSource.trim() || undefined,
                kbCategory: formData.kbCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            setMyItems((prev) => [created, ...prev]);
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
            const updated = await instructorKnowledgeBaseApi.update(selectedItem.kbId, {
                kbTitle: formData.kbTitle.trim(),
                kbContent: formData.kbContent.trim(),
                kbSource: formData.kbSource.trim() || undefined,
                kbCategory: formData.kbCategory.trim() || undefined,
                isActive: formData.isActive,
            });
            setMyItems((prev) => prev.map(item => item.kbId === updated.kbId ? updated : item));
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
            await instructorKnowledgeBaseApi.delete(id);
            setMyItems(prev => prev.filter(item => item.kbId !== id));
        } catch {
            setError(t("admin.knowledgeBase.deleteError", "Failed to delete item"));
        }
    };

    const handleSubmit = async (id: number) => {
        if (!window.confirm(t("instructor.knowledgeBase.confirmSubmit", "Bạn có chắc muốn gửi tài liệu này cho Admin duyệt? Sau khi gửi sẽ không thể chỉnh sửa."))) {
            return;
        }
        try {
            const updated = await instructorKnowledgeBaseApi.submit(id);
            setMyItems((prev) => prev.map(item => item.kbId === updated.kbId ? updated : item));
        } catch {
            setError(t("instructor.knowledgeBase.submitError", "Failed to submit item"));
        }
    };

    return (
        <InstructorLayout
            title={t("instructor.sidebar.knowledgeBase", "Kiến thức học thuật")}
            subtitle={t("instructor.knowledgeBase.subtitle", "Đóng góp và tra cứu tài liệu học thuật")}
            onSignOut={handleSignOut}
        >
            {error && <div className="alert">{error}</div>}
            
            <div className="tabs" style={{ marginBottom: 16 }}>
                <button 
                    className={`btn ${activeTab === 'my' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('my')}
                >
                    {t("instructor.knowledgeBase.tabs.my", "Kiến thức của tôi")}
                </button>
                <button 
                    className={`btn ${activeTab === 'system' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('system')}
                >
                    {t("instructor.knowledgeBase.tabs.system", "Kiến thức hệ thống (Đã duyệt)")}
                </button>
            </div>

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
                            <p><strong>{t("admin.knowledgeBase.approvalStatus", "Trạng thái duyệt")}:</strong> <span className={`tag ${selectedItem.approvalStatus === 'APPROVED' ? 'text-success' : selectedItem.approvalStatus === 'REJECTED' ? 'text-danger' : selectedItem.approvalStatus === 'SUBMITTED' ? 'text-primary' : ''}`}>{selectedItem.approvalStatus}</span></p>
                            {selectedItem.reviewNote && (
                                <p><strong>{t("admin.knowledgeBase.reviewNote", "Lý do từ chối")}:</strong> <span className="text-danger">{selectedItem.reviewNote}</span></p>
                            )}
                            <p><strong>{t("admin.knowledgeBase.kbCategory", "Danh mục")}:</strong> {selectedItem.kbCategory || "-"}</p>
                            <p><strong>{t("admin.knowledgeBase.kbSource", "Nguồn")}:</strong> {selectedItem.kbSource || "-"}</p>
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
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-primary">{t("common.save", "Lưu")}</button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseEdit}>{t("common.cancel", "Hủy")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'my' && (
                <section className="section-card">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                        <div></div>
                        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                            <Plus size={12} /> {t("admin.knowledgeBase.create", "Thêm bản nháp")}
                        </button>
                    </div>
                    {loading ? (
                        <p>{t("common.loading", "Đang tải...")}</p>
                    ) : myItems.length === 0 ? (
                        <p>{t("common.empty", "Không có dữ liệu")}</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")}</th>
                                        <th>{t("admin.knowledgeBase.approvalStatus", "Kiểm duyệt")}</th>
                                        <th>{t("common.actions", "Thao tác")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myItems.map((item) => (
                                        <tr key={item.kbId}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{item.kbTitle}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.kbCategory || 'Chưa phân loại'}</div>
                                            </td>
                                            <td>
                                                <div className={`tag ${item.approvalStatus === 'APPROVED' ? 'text-success' : item.approvalStatus === 'REJECTED' ? 'text-danger' : item.approvalStatus === 'SUBMITTED' ? 'text-primary' : ''}`}>
                                                    {item.approvalStatus}
                                                </div>
                                                {item.reviewNote && (
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 4, maxWidth: 200 }}>
                                                        {item.reviewNote.length > 50 ? item.reviewNote.substring(0, 50) + '...' : item.reviewNote}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button type="button" className="btn btn-icon" onClick={() => handleOpenDetail(item)} title={t("common.view", "Xem")}>
                                                        <Eye size={18} />
                                                    </button>
                                                    
                                                    {(item.approvalStatus === 'DRAFT' || item.approvalStatus === 'REJECTED') && (
                                                        <>
                                                            <button type="button" className="btn btn-icon" style={{ color: "var(--primary)" }} onClick={() => handleSubmit(item.kbId)} title={t("common.submit", "Gửi duyệt")}>
                                                                <Send size={18} />
                                                            </button>
                                                            <button type="button" className="btn btn-icon" onClick={() => handleOpenEdit(item)} title={t("common.edit", "Sửa")}>
                                                                <Edit2 size={18} />
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
            )}

            {activeTab === 'system' && (
                <section className="section-card">
                    {loading ? (
                        <p>{t("common.loading", "Đang tải...")}</p>
                    ) : systemItems.length === 0 ? (
                        <p>{t("common.empty", "Không có dữ liệu")}</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t("admin.knowledgeBase.kbTitle", "Tiêu đề")}</th>
                                        <th>{t("admin.knowledgeBase.kbCategory", "Danh mục")}</th>
                                        <th>{t("common.actions", "Thao tác")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {systemItems.map((item) => (
                                        <tr key={item.kbId}>
                                            <td>{item.kbTitle}</td>
                                            <td>{item.kbCategory || "-"}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <button type="button" className="btn btn-icon" onClick={() => handleOpenDetail(item)} title={t("common.view", "Xem")}>
                                                        <Eye size={18} />
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
            )}
        </InstructorLayout>
    );
};

export default InstructorKnowledgeBasePage;
