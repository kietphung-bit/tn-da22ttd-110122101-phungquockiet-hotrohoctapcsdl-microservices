import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../hooks/useAuth";
import AuthLayout from "../../../components/layouts/AuthLayout";
import PasswordField from "../../../components/auth/PasswordField";
import type { UserGender } from "../../../types";

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { t } = useTranslation();
    const [step, setStep] = useState<1 | 2>(1);
    const [userEmail, setUserEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [userGender, setUserGender] = useState<UserGender | "">("");
    const [userDob, setUserDob] = useState("");
    const [userPhone, setUserPhone] = useState("");
    const [userAddress, setUserAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (step === 1) {
            setStep(2);
            return;
        }

        if (password !== confirmPassword) {
            setError(t("register.confirmMismatch"));
            return;
        }

        setLoading(true);
        try {
            await register({
                userEmail,
                password,
                fullName: fullName.trim(),
                userGender: userGender || null,
                userDob: userDob || null,
                userPhone: userPhone.trim() || null,
                userAddress: userAddress.trim() || null,
            });
            navigate("/student/exercise-generator");
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
                {step === 1 ? (
                    <>
                        <div className="form-field">
                            <label htmlFor="fullName">{t("register.fullName")}</label>
                            <input
                                id="fullName"
                                className="input"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoComplete="name"
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
                                autoComplete="email"
                                required
                            />
                        </div>
                        <PasswordField
                            id="password"
                            label={t("register.password")}
                            value={password}
                            onChange={setPassword}
                            autoComplete="new-password"
                            required
                        />
                    </>
                ) : (
                    <>
                        <div className="form-field">
                            <label htmlFor="fullNameStepTwo">{t("register.fullName")}</label>
                            <input
                                id="fullNameStepTwo"
                                className="input"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                autoComplete="name"
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="emailStepTwo">{t("register.email")}</label>
                            <input id="emailStepTwo" className="input" type="email" value={userEmail} disabled />
                        </div>
                        <PasswordField
                            id="passwordStepTwo"
                            label={t("register.password")}
                            value={password}
                            onChange={setPassword}
                            autoComplete="new-password"
                            required
                        />
                        <PasswordField
                            id="confirmPassword"
                            label={t("register.confirmPassword")}
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            autoComplete="new-password"
                            required
                        />
                        <div className="form-field">
                            <label htmlFor="userGender">{t("register.gender")}</label>
                            <select
                                id="userGender"
                                className="input"
                                value={userGender}
                                onChange={(event) => setUserGender(event.target.value as UserGender | "")}
                            >
                                <option value="">{t("register.genderEmpty")}</option>
                                <option value="MALE">{t("register.genderMale")}</option>
                                <option value="FEMALE">{t("register.genderFemale")}</option>
                                <option value="OTHER">{t("register.genderOther")}</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label htmlFor="userDob">{t("register.dob")}</label>
                            <input
                                id="userDob"
                                className="input"
                                type="date"
                                value={userDob}
                                onChange={(event) => setUserDob(event.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="userPhone">{t("register.phone")}</label>
                            <input
                                id="userPhone"
                                className="input"
                                type="tel"
                                value={userPhone}
                                onChange={(event) => setUserPhone(event.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="userAddress">{t("register.address")}</label>
                            <input
                                id="userAddress"
                                className="input"
                                type="text"
                                value={userAddress}
                                onChange={(event) => setUserAddress(event.target.value)}
                            />
                        </div>
                    </>
                )}
                <div className={`auth-actions${step === 2 ? " auth-actions--split" : ""}`}>
                    {step === 2 && (
                        <button type="button" className="btn btn-outline" onClick={() => setStep(1)} disabled={loading}>
                            {t("register.back")}
                        </button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {step === 1 ? t("register.next") : loading ? t("register.submitting") : t("register.submit")}
                    </button>
                </div>
            </form>
            <p style={{ marginTop: 16 }}>
                {t("register.haveAccount")} <Link to="/login">{t("register.loginLink")}</Link>
            </p>
        </AuthLayout>
    );
};

export default RegisterPage;
