import AccountMenu from "../account/AccountMenu";

type AdminTopbarProps = {
    title: string;
    subtitle?: string;
    onSignOut: () => void;
};

const AdminTopbar = ({ title, subtitle, onSignOut }: AdminTopbarProps) => {
    return (
        <header className="admin-topbar">
            <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>{title}</div>
                {subtitle && <div style={{ color: "var(--ink-soft)" }}>{subtitle}</div>}
            </div>
            <AccountMenu onSignOut={onSignOut} />
        </header>
    );
};

export default AdminTopbar;
