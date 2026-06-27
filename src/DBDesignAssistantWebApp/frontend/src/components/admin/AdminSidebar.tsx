import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const AdminSidebar = () => {
    const { t } = useTranslation();
    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar__brand">
                <span className="auth-brand">{t("common.brand")}</span>
                <div className="admin-sidebar__title">{t("admin.sidebar.title")}</div>
            </div>
            <nav className="admin-sidebar__nav">
                <NavLink
                    to="/admin/users"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.users")}
                </NavLink>
                <NavLink
                    to="/admin/exercises"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.exercises")}
                </NavLink>
                <NavLink
                    to="/admin/submissions"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.submissions")}
                </NavLink>
                
                {/* <NavLink
                    to="/admin/evaluation-rounds"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.evaluationRounds", "Vòng chấm bài")}
                </NavLink> */}
                <NavLink
                    to="/admin/knowledge-base"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.knowledgeBase", "Kho học liệu")}
                </NavLink>
                <NavLink
                    to="/admin/skills"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.skills", "Kỹ năng")}
                </NavLink>
                {/* StudentSkillStats route remains available, but the sidebar link is hidden until the stats data source is production-backed. */}
                {/* <NavLink
                    to="/admin/student-skill-stats"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.studentSkillStats", "Thống kê kỹ năng")}
                </NavLink> */}
                <NavLink
                    to="/admin/practice-insights"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.practiceInsights")}
                </NavLink>
            </nav>
        </aside>
    );
};

export default AdminSidebar;

