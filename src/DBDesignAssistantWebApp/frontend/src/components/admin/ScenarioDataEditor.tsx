import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "";

interface ScenarioFormData {
    businessContext: string;
    requirements: string[];
    constraints: string[];
    difficulty: Difficulty;
    tags: string[];
}

interface ScenarioDataEditorProps {
    value: Record<string, unknown>;
    onChange: (v: Record<string, unknown>) => void;
    error?: string;
}

function jsonToForm(data: Record<string, unknown>): ScenarioFormData {
    return {
        businessContext:
            (data.businessContext as string) ||
            (data.context as string) ||
            "",
        requirements: Array.isArray(data.requirements)
            ? (data.requirements as string[]).map(String)
            : [],
        constraints: Array.isArray(data.constraints)
            ? (data.constraints as string[]).map(String)
            : [],
        difficulty: (data.difficulty as Difficulty) || "",
        tags: Array.isArray(data.tags)
            ? (data.tags as string[]).map(String)
            : [],
    };
}

function formToJson(form: ScenarioFormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    if (form.businessContext.trim()) obj.businessContext = form.businessContext.trim();
    if (form.requirements.filter(Boolean).length)
        obj.requirements = form.requirements.filter(Boolean);
    if (form.constraints.filter(Boolean).length)
        obj.constraints = form.constraints.filter(Boolean);
    if (form.difficulty) obj.difficulty = form.difficulty;
    if (form.tags.filter(Boolean).length)
        obj.tags = form.tags.filter(Boolean);
    return obj;
}

const ScenarioDataEditor = ({ value, onChange, error }: ScenarioDataEditorProps) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<"form" | "raw">("form");
    const [form, setForm] = useState<ScenarioFormData>(() => jsonToForm(value || {}));
    const [rawText, setRawText] = useState(() => JSON.stringify(value || {}, null, 2));
    const [rawError, setRawError] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState("");

    // Sync form→parent
    useEffect(() => {
        if (mode === "form") {
            onChange(formToJson(form));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, mode]);

    // When switching raw→form, sync rawText into form
    const switchToForm = () => {
        try {
            const parsed = JSON.parse(rawText || "{}");
            setForm(jsonToForm(parsed));
            onChange(parsed);
            setRawError(null);
            setMode("form");
        } catch {
            setRawError(t("admin.exercises.scenarioEditor.rawPlaceholder"));
        }
    };

    // When switching form→raw, serialize form into raw
    const switchToRaw = () => {
        const json = formToJson(form);
        setRawText(JSON.stringify(json, null, 2));
        onChange(json);
        setRawError(null);
        setMode("raw");
    };

    const handleRawChange = (text: string) => {
        setRawText(text);
        try {
            const parsed = JSON.parse(text || "{}");
            setRawError(null);
            onChange(parsed);
        } catch {
            setRawError(t("admin.exercises.validation.scenarioJson"));
        }
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(rawText || "{}");
            setRawText(JSON.stringify(parsed, null, 2));
            setRawError(null);
            onChange(parsed);
        } catch {
            setRawError(t("admin.exercises.validation.scenarioJson"));
        }
    };

    // Dynamic list helpers
    const updateList = (key: "requirements" | "constraints", index: number, val: string) => {
        setForm((prev) => {
            const list = [...prev[key]];
            list[index] = val;
            return { ...prev, [key]: list };
        });
    };

    const addListItem = (key: "requirements" | "constraints") => {
        setForm((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
    };

    const removeListItem = (key: "requirements" | "constraints", index: number) => {
        setForm((prev) => {
            const list = [...prev[key]];
            list.splice(index, 1);
            return { ...prev, [key]: list };
        });
    };

    const addTag = () => {
        const tag = tagInput.trim();
        if (!tag) return;
        if (!form.tags.includes(tag)) {
            setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
        }
        setTagInput("");
    };

    const removeTag = (idx: number) => {
        setForm((prev) => {
            const tags = [...prev.tags];
            tags.splice(idx, 1);
            return { ...prev, tags };
        });
    };

    return (
        <div className="scenario-editor">
            {/* Mode toggle */}
            <div className="editor-mode-bar">
                <button
                    type="button"
                    className={`editor-mode-btn ${mode === "form" ? "active" : ""}`}
                    onClick={mode === "raw" ? switchToForm : undefined}
                    title={t("admin.exercises.scenarioEditor.formMode")}
                >
                    {t("admin.exercises.scenarioEditor.formMode")}
                </button>
                <button
                    type="button"
                    className={`editor-mode-btn ${mode === "raw" ? "active" : ""}`}
                    onClick={mode === "form" ? switchToRaw : undefined}
                    title={t("admin.exercises.scenarioEditor.rawMode")}
                >
                    {t("admin.exercises.scenarioEditor.rawMode")}
                </button>
            </div>

            {error && <div className="alert">{error}</div>}

            {mode === "form" ? (
                <div className="scenario-form">
                    {/* Business context */}
                    <div className="form-field">
                        <label>{t("admin.exercises.scenarioEditor.businessContext")}</label>
                        <textarea
                            className="textarea"
                            rows={3}
                            placeholder={t("admin.exercises.scenarioEditor.businessContextPlaceholder")}
                            value={form.businessContext}
                            onChange={(e) => setForm((prev) => ({ ...prev, businessContext: e.target.value }))}
                        />
                    </div>

                    {/* Requirements */}
                    <div className="form-field">
                        <label>{t("admin.exercises.scenarioEditor.requirements")}</label>
                        {form.requirements.map((req, idx) => (
                            <div key={idx} className="dynamic-list-row">
                                <input
                                    className="input"
                                    type="text"
                                    value={req}
                                    placeholder={t("admin.exercises.scenarioEditor.requirementPlaceholder")}
                                    onChange={(e) => updateList("requirements", idx, e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn-icon btn-icon--danger"
                                    onClick={() => removeListItem("requirements", idx)}
                                    title="Xóa"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => addListItem("requirements")}
                        >
                            {t("admin.exercises.scenarioEditor.addRequirement")}
                        </button>
                    </div>

                    {/* Constraints */}
                    <div className="form-field">
                        <label>{t("admin.exercises.scenarioEditor.constraints")}</label>
                        {form.constraints.map((c, idx) => (
                            <div key={idx} className="dynamic-list-row">
                                <input
                                    className="input"
                                    type="text"
                                    value={c}
                                    placeholder={t("admin.exercises.scenarioEditor.constraintPlaceholder")}
                                    onChange={(e) => updateList("constraints", idx, e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="btn-icon btn-icon--danger"
                                    onClick={() => removeListItem("constraints", idx)}
                                    title="Xóa"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => addListItem("constraints")}
                        >
                            {t("admin.exercises.scenarioEditor.addConstraint")}
                        </button>
                    </div>

                    {/* Difficulty */}
                    <div className="form-field">
                        <label>{t("admin.exercises.scenarioEditor.difficulty")}</label>
                        <select
                            className="input"
                            value={form.difficulty}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, difficulty: e.target.value as Difficulty }))
                            }
                        >
                            <option value="">—</option>
                            <option value="EASY">{t("admin.exercises.scenarioEditor.difficultyEasy")}</option>
                            <option value="MEDIUM">{t("admin.exercises.scenarioEditor.difficultyMedium")}</option>
                            <option value="HARD">{t("admin.exercises.scenarioEditor.difficultyHard")}</option>
                        </select>
                    </div>

                    {/* Tags */}
                    <div className="form-field">
                        <label>{t("admin.exercises.scenarioEditor.tags")}</label>
                        <div className="tags-input-row">
                            <input
                                className="input"
                                type="text"
                                value={tagInput}
                                placeholder={t("admin.exercises.scenarioEditor.tagPlaceholder")}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={addTag}
                            >
                                {t("admin.exercises.scenarioEditor.addTag")}
                            </button>
                        </div>
                        {form.tags.length > 0 && (
                            <div className="tags-list">
                                {form.tags.map((tag, idx) => (
                                    <span key={idx} className="tag tag-removable">
                                        {tag}
                                        <button
                                            type="button"
                                            className="tag-remove-btn"
                                            onClick={() => removeTag(idx)}
                                            title="Xóa tag"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="form-field">
                    <textarea
                        className="textarea textarea--code"
                        rows={10}
                        placeholder={t("admin.exercises.scenarioEditor.rawPlaceholder")}
                        value={rawText}
                        onChange={(e) => handleRawChange(e.target.value)}
                        spellCheck={false}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleFormat}
                        >
                            {t("admin.exercises.scenarioEditor.formatJson")}
                        </button>
                    </div>
                    {rawError && <div className="alert">{rawError}</div>}
                </div>
            )}
        </div>
    );
};

export default ScenarioDataEditor;
