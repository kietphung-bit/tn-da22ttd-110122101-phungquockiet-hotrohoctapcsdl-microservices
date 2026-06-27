import React from "react";
import { useTranslation } from "react-i18next";

type AuthLayoutProps = {
    title: string;
    subtitle: string;
    children: React.ReactNode;
};

const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
    const { t } = useTranslation();
    return (
        <div className="auth-shell">
            <section className="auth-hero fade-in">
                <div className="auth-brand">{t("common.brand")}</div>
                <h1>{title}</h1>
                <p className="auth-subtitle">{subtitle}</p>
                <div className="section-card">
                    <p style={{ margin: 0 }}>
                      {t("common.quota")}
                        {/* Build logical models, validate schemas, and deliver sharper ERDs with guided feedback. */}
                    </p>
                </div>
            </section>
            <section className="auth-card fade-in">{children}</section>
        </div>
    );
};

export default AuthLayout;
