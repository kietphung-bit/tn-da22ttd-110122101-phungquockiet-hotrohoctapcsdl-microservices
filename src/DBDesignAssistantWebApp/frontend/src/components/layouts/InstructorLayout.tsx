import React from "react";
import InstructorSidebar from "../instructor/InstructorSidebar";
import AdminTopbar from "../admin/AdminTopbar";

type InstructorLayoutProps = {
    title: string;
    subtitle?: string;
    onSignOut: () => void;
    children: React.ReactNode;
};

const InstructorLayout = ({ title, subtitle, onSignOut, children }: InstructorLayoutProps) => {
    return (
        <div className="admin-shell">
            <InstructorSidebar />
            <div className="admin-main">
                <AdminTopbar title={title} subtitle={subtitle} onSignOut={onSignOut} />
                <main className="admin-content stagger">{children}</main>
            </div>
        </div>
    );
};

export default InstructorLayout;
