import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const InstructorSidebar = () => {
    const { t } = useTranslation();
    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar__brand">
                <span className="auth-brand">{t("common.brand")}</span>
                <div className="admin-sidebar__title">{t("instructor.sidebar.title")}</div>
            </div>
            <nav className="admin-sidebar__nav">
                <NavLink
                    to="/instructor/exercises"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("admin.sidebar.exercises", "Bài tập")}
                </NavLink>
                
                <NavLink
                    to="/instructor/knowledge-base"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("instructor.sidebar.knowledgeBase", "Kiến thức học thuật")}
                </NavLink>
                <NavLink
                    to="/instructor/practice-insights"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("instructor.sidebar.practiceInsights", "Thống kê")}
                </NavLink>
            </nav>
        </aside>
    );
};

export default InstructorSidebar;
