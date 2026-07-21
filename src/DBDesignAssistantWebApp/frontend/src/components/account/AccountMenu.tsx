import { type FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, IdCard, KeyRound, LogOut, UserRound, X } from "lucide-react";
import { accountApi } from "../../services";
import { useAuth } from "../../hooks/useAuth";
import type { User, UserGender } from "../../types";
import PasswordField from "../auth/PasswordField";

type AccountMenuProps = {
    onSignOut: () => void;
};

type ProfileForm = {
    fullName: string;
    userGender: UserGender | "";
    userDob: string;
    userPhone: string;
    userAddress: string;
};

type PasswordForm = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

type ActiveModal = "profile" | "password" | null;

const emptyProfileForm: ProfileForm = {
    fullName: "",
    userGender: "",
    userDob: "",
    userPhone: "",
    userAddress: "",
};

const emptyPasswordForm: PasswordForm = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
};

const toProfileForm = (user: User | null): ProfileForm => ({
    fullName: user?.fullName ?? "",
    userGender: user?.userGender ?? "",
    userDob: user?.userDob ?? "",
    userPhone: user?.userPhone ?? "",
    userAddress: user?.userAddress ?? "",
});

const AccountMenu = ({ onSignOut }: AccountMenuProps) => {
    const { t } = useTranslation();
    const { user, setUser } = useAuth();
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [account, setAccount] = useState<User | null>(user);
    const [open, setOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
    const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm);
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

    const displayAccount = account ?? user;

    useEffect(() => {
        let isCancelled = false;

        accountApi.getMe()
            .then((data) => {
                if (!isCancelled) {
                    setAccount(data);
                    setUser(data);
                }
            })
            .catch(() => undefined);

        return () => {
            isCancelled = true;
        };
    }, [setUser]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleDocumentMouseDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleDocumentMouseDown);
        return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
    }, [open]);

    const roleLabel = (roleName?: string) => {
        if (roleName === "ADMIN") return t("account.roles.admin");
        if (roleName === "INSTRUCTOR") return t("account.roles.instructor");
        if (roleName === "STUDENT") return t("account.roles.student");
        return t("account.roles.unknown");
    };

    const openProfileModal = () => {
        setProfileForm(toProfileForm(displayAccount));
        setProfileError(null);
        setProfileMessage(null);
        setActiveModal("profile");
        setOpen(false);
    };

    const openPasswordModal = () => {
        setPasswordForm(emptyPasswordForm);
        setPasswordError(null);
        setPasswordMessage(null);
        setActiveModal("password");
        setOpen(false);
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    const handleSignOut = () => {
        setOpen(false);
        onSignOut();
    };

    const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProfileError(null);
        setProfileMessage(null);
        if (!profileForm.fullName.trim()) {
            setProfileError(t("account.profile.requiredName"));
            return;
        }

        setProfileSaving(true);
        try {
            const updated = await accountApi.updateProfile({
                fullName: profileForm.fullName.trim(),
                userGender: profileForm.userGender || null,
                userDob: profileForm.userDob || null,
                userPhone: profileForm.userPhone.trim() || null,
                userAddress: profileForm.userAddress.trim() || null,
            });
            setAccount(updated);
            setUser(updated);
            setProfileForm(toProfileForm(updated));
            setProfileMessage(t("account.profile.success"));
        } catch {
            setProfileError(t("account.profile.error"));
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordError(null);
        setPasswordMessage(null);
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError(t("account.password.confirmMismatch"));
            return;
        }

        setPasswordSaving(true);
        try {
            await accountApi.changePassword(passwordForm);
            setPasswordForm(emptyPasswordForm);
            setPasswordMessage(t("account.password.success"));
        } catch {
            setPasswordError(t("account.password.error"));
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="account-menu" ref={rootRef}>
            <button
                type="button"
                className="btn btn-outline account-menu__trigger"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
            >
                <UserRound size={18} aria-hidden="true" />
                <span>{t("account.trigger")}</span>
                <ChevronDown size={16} aria-hidden="true" />
            </button>

            {open && (
                <div className="account-menu__dropdown">
                    <div className="account-menu__summary">
                        <div className="account-menu__name">
                            {displayAccount?.fullName || t("account.unknownName")}
                        </div>
                        <div className="account-menu__email">
                            {displayAccount?.userEmail || t("account.unknownEmail")}
                        </div>
                        <div className="tag">
                            {roleLabel(displayAccount?.role?.roleName)}
                        </div>
                    </div>
                    <button type="button" className="account-menu__item" onClick={openProfileModal}>
                        <IdCard size={16} aria-hidden="true" />
                        <span>{t("account.profile.action")}</span>
                    </button>
                    <button type="button" className="account-menu__item" onClick={openPasswordModal}>
                        <KeyRound size={16} aria-hidden="true" />
                        <span>{t("account.password.action")}</span>
                    </button>
                    <div className="account-menu__separator" />
                    <button type="button" className="account-menu__item account-menu__item--danger" onClick={handleSignOut}>
                        <LogOut size={16} aria-hidden="true" />
                        <span>{t("common.signOut")}</span>
                    </button>
                </div>
            )}

            {activeModal === "profile" && createPortal(
                <div className="modal-backdrop" role="presentation">
                    <section className="modal-card account-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
                        <div className="modal-header">
                            <div>
                                <h2 id="profile-title">{t("account.profile.title")}</h2>
                                <p>{t("account.profile.subtitle")}</p>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal} aria-label={t("common.close")}>
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        {profileError && <div className="alert">{profileError}</div>}
                        {profileMessage && <div className="alert alert-success">{profileMessage}</div>}
                        <form onSubmit={handleProfileSubmit}>
                            <div className="form-grid form-grid--two">
                                <div className="form-field">
                                    <label htmlFor="account-email">{t("account.profile.email")}</label>
                                    <input id="account-email" className="input" type="email" value={displayAccount?.userEmail ?? ""} disabled />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="account-role">{t("account.profile.role")}</label>
                                    <input id="account-role" className="input" type="text" value={roleLabel(displayAccount?.role?.roleName)} disabled />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="account-full-name">{t("account.profile.fullName")}</label>
                                    <input
                                        id="account-full-name"
                                        className="input"
                                        type="text"
                                        value={profileForm.fullName}
                                        onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="account-gender">{t("account.profile.gender")}</label>
                                    <select
                                        id="account-gender"
                                        className="input"
                                        value={profileForm.userGender}
                                        onChange={(event) =>
                                            setProfileForm((current) => ({
                                                ...current,
                                                userGender: event.target.value as UserGender | "",
                                            }))
                                        }
                                    >
                                        <option value="">{t("account.profile.genderEmpty")}</option>
                                        <option value="MALE">{t("account.profile.genderMale")}</option>
                                        <option value="FEMALE">{t("account.profile.genderFemale")}</option>
                                        <option value="OTHER">{t("account.profile.genderOther")}</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="account-dob">{t("account.profile.dob")}</label>
                                    <input
                                        id="account-dob"
                                        className="input"
                                        type="date"
                                        value={profileForm.userDob}
                                        onChange={(event) => setProfileForm((current) => ({ ...current, userDob: event.target.value }))}
                                    />
                                </div>
                                <div className="form-field">
                                    <label htmlFor="account-phone">{t("account.profile.phone")}</label>
                                    <input
                                        id="account-phone"
                                        className="input"
                                        type="tel"
                                        value={profileForm.userPhone}
                                        onChange={(event) => setProfileForm((current) => ({ ...current, userPhone: event.target.value }))}
                                    />
                                </div>
                                <div className="form-field form-field--wide">
                                    <label htmlFor="account-address">{t("account.profile.address")}</label>
                                    <input
                                        id="account-address"
                                        className="input"
                                        type="text"
                                        value={profileForm.userAddress}
                                        onChange={(event) => setProfileForm((current) => ({ ...current, userAddress: event.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    {t("common.cancel")}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                                    {profileSaving ? t("account.profile.saving") : t("account.profile.save")}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>,
                document.body
            )}

            {activeModal === "password" && createPortal(
                <div className="modal-backdrop" role="presentation">
                    <section className="modal-card account-modal account-modal--narrow" role="dialog" aria-modal="true" aria-labelledby="password-title">
                        <div className="modal-header">
                            <div>
                                <h2 id="password-title">{t("account.password.title")}</h2>
                                <p>{t("account.password.subtitle")}</p>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal} aria-label={t("common.close")}>
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                        {passwordError && <div className="alert">{passwordError}</div>}
                        {passwordMessage && <div className="alert alert-success">{passwordMessage}</div>}
                        <form onSubmit={handlePasswordSubmit}>
                            <PasswordField
                                id="currentPassword"
                                label={t("account.password.currentPassword")}
                                value={passwordForm.currentPassword}
                                onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
                                autoComplete="current-password"
                                required
                            />
                            <PasswordField
                                id="newPassword"
                                label={t("account.password.newPassword")}
                                value={passwordForm.newPassword}
                                onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
                                autoComplete="new-password"
                                required
                            />
                            <PasswordField
                                id="confirmPassword"
                                label={t("account.password.confirmPassword")}
                                value={passwordForm.confirmPassword}
                                onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                                autoComplete="new-password"
                                required
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={closeModal}>
                                    {t("common.cancel")}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                                    {passwordSaving ? t("account.password.saving") : t("account.password.save")}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AccountMenu;
