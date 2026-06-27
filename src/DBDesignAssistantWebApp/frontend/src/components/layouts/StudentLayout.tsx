import React from "react";
import StudentSidebar from "../student/StudentSidebar";
import AdminTopbar from "../admin/AdminTopbar";

type StudentLayoutProps = {
    title: string;
    subtitle?: string;
    onSignOut: () => void;
    children: React.ReactNode;
};

const StudentLayout = ({ title, subtitle, onSignOut, children }: StudentLayoutProps) => {
    return (
        <div className="admin-shell">
            <StudentSidebar />
            <div className="admin-main">
                <AdminTopbar title={title} subtitle={subtitle} onSignOut={onSignOut} />
                <main className="admin-content stagger">{children}</main>
            </div>
        </div>
    );
};

export default StudentLayout;
