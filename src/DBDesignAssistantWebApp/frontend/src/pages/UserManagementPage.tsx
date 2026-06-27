import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import userApi from "../services/userApi";
import type { User } from "../types";
import { useAuth } from "../hooks/useAuth";
import AdminLayout from "../components/layouts/AdminLayout";
import { useTranslation } from "react-i18next";
import { Eye, Trash2, Lock, Unlock, Plus } from "lucide-react";

const UserManagementPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        userEmail: "",
        password: "",
        fullName: "",
        roleName: "STUDENT" as "STUDENT" | "INSTRUCTOR",
        userGender: "" as "" | "MALE" | "FEMALE" | "OTHER",
        userDob: "",
        userPhone: "",
        userAddress: "",
    });

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await userApi.getAllUsers();
            setUsers(data);
        } catch {
            setError(t("admin.users.loadError"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        const init = async () => {
            await loadUsers();
        };
        init();
    }, [loadUsers]);

    const handleToggleActive = async (user: User) => {
        const confirmMessage = user.isActive
            ? t("admin.users.confirmDisable")
            : t("admin.users.confirmEnable");
        if (!window.confirm(confirmMessage)) {
            return;
        }
        setError(null);
        try {
            const updated = user.isActive
                ? await userApi.disableUser(user.userId)
                : await userApi.enableUser(user.userId);
            setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
        } catch {
            setError(user.isActive ? t("admin.users.disableError") : t("admin.users.enableError"));
        }
    };

    const handleDelete = async (userId: number) => {
        if (!window.confirm(t("admin.users.confirmDelete"))) {
            return;
        }
        setError(null);
        try {
            await userApi.deleteUser(userId);
            setUsers((prev) => prev.filter((u) => u.userId !== userId));
        } catch {
            setError(t("admin.users.deleteError"));
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const handleOpenCreate = () => {
        setFormError(null);
        setFormData({
            userEmail: "",
            password: "",
            fullName: "",
            roleName: "STUDENT",
            userGender: "",
            userDob: "",
            userPhone: "",
            userAddress: "",
        });
        setIsCreateOpen(true);
    };

    const handleCloseCreate = () => {
        setIsCreateOpen(false);
        setFormError(null);
    };

    const handleOpenDetail = async (userId: number) => {
        setFormError(null);
        try {
            const data = await userApi.getUserById(userId);
            setSelectedUser(data);
            setIsDetailOpen(true);
        } catch {
            setError(t("admin.users.detailError"));
        }
    };

    const handleCloseDetail = () => {
        setIsDetailOpen(false);
        setSelectedUser(null);
    };

    const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);
        if (!formData.userEmail.trim() || !formData.password.trim() || !formData.fullName.trim()) {
            setFormError(t("admin.users.form.missingRequired"));
            return;
        }

        try {
            const created = await userApi.createUser({
                userEmail: formData.userEmail.trim(),
                password: formData.password,
                fullName: formData.fullName.trim(),
                roleName: formData.roleName,
                userGender: formData.userGender ? formData.userGender : undefined,
                userDob: formData.userDob ? formData.userDob : undefined,
                userPhone: formData.userPhone.trim() || undefined,
                userAddress: formData.userAddress.trim() || undefined,
            });
            setUsers((prev) => [created, ...prev]);
            handleCloseCreate();
        } catch {
            setFormError(t("admin.users.form.createError"));
        }
    };

    return (
        <AdminLayout
            title={t("admin.users.title")}
            subtitle={t("admin.users.subtitle")}
            onSignOut={handleSignOut}
        >
            {error && <div className="alert">{error}</div>}
            {isCreateOpen && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.users.form.createTitle")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseCreate}>
                                {t("admin.users.form.close")}
                            </button>
                        </div>
                        {formError && <div className="alert">{formError}</div>}
                        <form onSubmit={handleCreateUser} className="stagger">
                            <div className="form-field">
                                <label htmlFor="userEmail">{t("admin.users.form.email")}</label>
                                <input
                                    id="userEmail"
                                    className="input"
                                    type="email"
                                    value={formData.userEmail}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, userEmail: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="fullName">{t("admin.users.form.fullName")}</label>
                                <input
                                    id="fullName"
                                    className="input"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, fullName: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="password">{t("admin.users.form.password")}</label>
                                <input
                                    id="password"
                                    className="input"
                                    type="password"
                                    value={formData.password}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, password: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="roleName">{t("admin.users.form.role")}</label>
                                <select
                                    id="roleName"
                                    className="input"
                                    value={formData.roleName}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, roleName: event.target.value as "STUDENT" | "INSTRUCTOR" }))
                                    }
                                >
                                    <option value="STUDENT">{t("admin.users.roles.student")}</option>
                                    <option value="INSTRUCTOR">{t("admin.users.roles.instructor")}</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label htmlFor="userGender">{t("admin.users.form.gender")}</label>
                                <select
                                    id="userGender"
                                    className="input"
                                    value={formData.userGender}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, userGender: event.target.value as "" | "MALE" | "FEMALE" | "OTHER" }))
                                    }
                                >
                                    <option value="">{t("admin.users.form.genderEmpty")}</option>
                                    <option value="MALE">{t("admin.users.form.genderMale")}</option>
                                    <option value="FEMALE">{t("admin.users.form.genderFemale")}</option>
                                    <option value="OTHER">{t("admin.users.form.genderOther")}</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label htmlFor="userDob">{t("admin.users.form.dob")}</label>
                                <input
                                    id="userDob"
                                    className="input"
                                    type="date"
                                    value={formData.userDob}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, userDob: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="userPhone">{t("admin.users.form.phone")}</label>
                                <input
                                    id="userPhone"
                                    className="input"
                                    type="text"
                                    value={formData.userPhone}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, userPhone: event.target.value }))
                                    }
                                />
                            </div>
                            <div className="form-field">
                                <label htmlFor="userAddress">{t("admin.users.form.address")}</label>
                                <input
                                    id="userAddress"
                                    className="input"
                                    type="text"
                                    value={formData.userAddress}
                                    onChange={(event) =>
                                        setFormData((prev) => ({ ...prev, userAddress: event.target.value }))
                                    }
                                />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button type="submit" className="btn btn-primary">
                                    {t("admin.users.form.create")}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={handleCloseCreate}>
                                    {t("admin.users.form.cancel")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {isDetailOpen && selectedUser && (
                <div className="modal-backdrop" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h2>{t("admin.users.detailTitle")}</h2>
                            <button type="button" className="btn btn-ghost" onClick={handleCloseDetail}>
                                {t("admin.users.form.close")}
                            </button>
                        </div>
                        <div className="stagger">
                            <p><strong>{t("admin.users.detail.email")}</strong> {selectedUser.userEmail}</p>
                            <p><strong>{t("admin.users.detail.name")}</strong> {selectedUser.fullName}</p>
                            <p><strong>{t("admin.users.detail.role")}</strong> {selectedUser.role.roleName}</p>
                            <p><strong>{t("admin.users.detail.status")}</strong> {selectedUser.isActive ? t("common.active") : t("common.disabled")}</p>
                            <p><strong>{t("admin.users.detail.gender")}</strong> {selectedUser.userGender || "-"}</p>
                            <p><strong>{t("admin.users.detail.dob")}</strong> {selectedUser.userDob || "-"}</p>
                            <p><strong>{t("admin.users.detail.phone")}</strong> {selectedUser.userPhone || "-"}</p>
                            <p><strong>{t("admin.users.detail.address")}</strong> {selectedUser.userAddress || "-"}</p>
                        </div>
                    </div>
                </div>
            )}
            <section className="section-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{t("admin.users.title")}</h2>
                        <p style={{ margin: 0, color: "var(--ink-soft)" }}>{t("admin.users.subtitle")}</p>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
                        <Plus size={12} /> {t("admin.users.form.openCreate")}
                    </button>
                </div>
                {loading ? (
                    <p>{t("admin.users.loading")}</p>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t("admin.users.columns.name")}</th>
                                <th>{t("admin.users.columns.email")}</th>
                                <th>{t("admin.users.columns.role")}</th>
                                <th>{t("admin.users.columns.status")}</th>
                                <th>{t("admin.users.columns.actions")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.userId}>
                                    <td>{user.fullName}</td>
                                    <td>{user.userEmail}</td>
                                    <td>{user.role.roleName}</td>
                                    <td>
                                        <span className="tag">
                                            {user.isActive ? t("common.active") : t("common.disabled")}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                type="button"
                                                className="btn btn-icon"
                                                onClick={() => handleToggleActive(user)}
                                                disabled={user.role.roleName === "ADMIN"}
                                                title={user.isActive ? t("admin.users.disable") : t("admin.users.enable")}
                                            >
                                                {user.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-icon"
                                                onClick={() => handleOpenDetail(user.userId)}
                                                title={t("admin.users.view")}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-icon btn-danger"
                                                onClick={() => handleDelete(user.userId)}
                                                disabled={user.role.roleName === "ADMIN"}
                                                title={t("admin.users.delete")}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </AdminLayout>
    );
};

export default UserManagementPage;
