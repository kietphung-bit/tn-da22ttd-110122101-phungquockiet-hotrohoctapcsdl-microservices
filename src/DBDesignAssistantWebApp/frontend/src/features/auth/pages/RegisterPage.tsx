import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../../../components/layouts/AuthLayout";

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { t } = useTranslation();
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await register({ userEmail, password, fullName });
            navigate("/admin/users");
        } catch {
            setError(t("register.error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t("register.heroTitle")} subtitle={t("register.heroSubtitle")}>
            <div className="auth-brand">{t("register.submit")}</div>
            <h2 className="auth-title">{t("register.heading")}</h2>
            <p className="auth-subtitle">{t("register.subheading")}</p>
            {error && <div className="alert">{error}</div>}
            <form onSubmit={handleSubmit} className="stagger">
                <div className="form-field">
                    <label htmlFor="fullName">{t("register.fullName")}</label>
                    <input
                        id="fullName"
                        className="input"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-field">
                    <label htmlFor="userEmail">{t("register.email")}</label>
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
                    <label htmlFor="password">{t("register.password")}</label>
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
                    {loading ? t("register.submitting") : t("register.submit")}
                </button>
            </form>
            <p style={{ marginTop: 16 }}>
                {t("register.haveAccount")} <Link to="/login">{t("register.loginLink")}</Link>
            </p>
        </AuthLayout>
    );
};

export default RegisterPage;
