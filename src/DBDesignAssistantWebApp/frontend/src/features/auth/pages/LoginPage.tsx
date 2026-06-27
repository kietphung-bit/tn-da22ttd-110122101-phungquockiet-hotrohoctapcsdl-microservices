import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../../../components/layouts/AuthLayout";

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuth();
    const { t } = useTranslation();
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role?.roleName === "INSTRUCTOR") {
                navigate("/instructor/exercises");
            } else if (user.role?.roleName === "STUDENT") {
                navigate("/student/exercise-generator");
            } else {
                navigate("/admin/users");
            }
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await login({ userEmail, password });
            if (data.roleName === "INSTRUCTOR") {
                navigate("/instructor/exercises");
            } else if (data.roleName === "STUDENT") {
                navigate("/student/exercise-generator");
            } else {
                navigate("/admin/users");
            }
        } catch {
            setError(t("login.error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t("login.heroTitle")} subtitle={t("login.heroSubtitle")}>
            <div className="auth-brand">{t("login.submit")}</div>
            <h2 className="auth-title">{t("login.heading")}</h2>
            <p className="auth-subtitle">{t("login.subheading")}</p>
            {error && <div className="alert">{error}</div>}
            <form onSubmit={handleSubmit} className="stagger">
                <div className="form-field">
                    <label htmlFor="userEmail">{t("login.email")}</label>
                    <input
                        id="userEmail"
                        className="input"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-field">
                    <label htmlFor="password">{t("login.password")}</label>
                    <input
                        id="password"
                        className="input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? t("login.submitting") : t("login.submit")}
                </button>
            </form>
            <p style={{ marginTop: 16 }}>
                {t("login.noAccount")} <Link to="/register">{t("login.registerLink")}</Link>
            </p>
        </AuthLayout>
    );
};

export default LoginPage;
