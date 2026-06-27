import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const StudentSidebar = () => {
    const { t } = useTranslation();

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar__brand">
                <span className="auth-brand">{t("common.brand")}</span>
                <div className="admin-sidebar__title">
                    {t("student.sidebar.title", { defaultValue: "Không gian học tập" })}
                </div>
            </div>
            <nav className="admin-sidebar__nav">                
                <NavLink
                    to="/student/exercise-generator"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("student.sidebar.practice", { defaultValue: "Bắt đầu thực hành" })}
                </NavLink>
                <NavLink
                    to="/student/chatbot"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("student.sidebar.chatbot")}
                </NavLink>
                <NavLink
                    to="/student/exercises"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("student.sidebar.exercises", { defaultValue: "Danh sách bài tập" })}
                </NavLink>
                <NavLink
                    to="/student/submissions"
                    className={({ isActive }) =>
                        `admin-sidebar__link${isActive ? " active" : ""}`
                    }
                >
                    {t("student.sidebar.submissions", { defaultValue: "Lịch sử nộp bài" })}
                </NavLink>
            </nav>
        </aside>
    );
};

export default StudentSidebar;
