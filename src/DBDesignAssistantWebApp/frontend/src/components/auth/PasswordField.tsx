import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    disabled?: boolean;
    required?: boolean;
};

const PasswordField = ({
    id,
    label,
    value,
    onChange,
    autoComplete,
    disabled = false,
    required = false,
}: PasswordFieldProps) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible ? t("common.hidePassword") : t("common.showPassword");

    return (
        <div className="form-field">
            <label htmlFor={id}>{label}</label>
            <div className="password-input-wrap">
                <input
                    id={id}
                    className="input password-input"
                    type={visible ? "text" : "password"}
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    required={required}
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setVisible((current) => !current)}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                    disabled={disabled}
                >
                    {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
};

export default PasswordField;
