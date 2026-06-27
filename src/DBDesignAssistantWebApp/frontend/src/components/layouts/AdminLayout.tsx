import React from "react";
import AdminSidebar from "../admin/AdminSidebar";
import AdminTopbar from "../admin/AdminTopbar";

type AdminLayoutProps = {
    title: string;
    subtitle?: string;
    onSignOut: () => void;
    children: React.ReactNode;
};

const AdminLayout = ({ title, subtitle, onSignOut, children }: AdminLayoutProps) => {
    return (
        <div className="admin-shell">
            <AdminSidebar />
            <div className="admin-main">
                <AdminTopbar title={title} subtitle={subtitle} onSignOut={onSignOut} />
                <main className="admin-content stagger">{children}</main>
            </div>
        </div>
    );
};

export default AdminLayout;
