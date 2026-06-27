import { useTranslation } from "react-i18next";

type AdminTopbarProps = {
    title: string;
    subtitle?: string;
    onSignOut: () => void;
};

const AdminTopbar = ({ title, subtitle, onSignOut }: AdminTopbarProps) => {
    const { t } = useTranslation();
    return (
        <header className="admin-topbar">
            <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{title}</div>
                {subtitle && <div style={{ color: "var(--ink-soft)" }}>{subtitle}</div>}
            </div>
            <button type="button" className="btn btn-outline" onClick={onSignOut}>
                {t("common.signOut")}
            </button>
        </header>
    );
};

export default AdminTopbar;
