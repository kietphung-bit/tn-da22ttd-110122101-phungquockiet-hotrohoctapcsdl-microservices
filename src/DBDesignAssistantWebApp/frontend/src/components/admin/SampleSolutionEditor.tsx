import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import sampleSolutionApi from "../../services/sampleSolutionApi";
import { instructorSampleSolutionApi } from "../../services/instructorSampleSolutionApi";
import type { SampleSolution } from "../../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntityForm {
    name: string;
    primaryKey: string;
    attributesText: string; // one attribute per line
}

interface RelationshipForm {
    from: string;
    to: string;
    cardinality: string;
    description: string;
}

interface SolutionFormData {
    entities: EntityForm[];
    relationships: RelationshipForm[];
    normalizationNotes: string;
    constraints: string[];
}

// ─── Converters ──────────────────────────────────────────────────────────────

function jsonToForm(data: Record<string, unknown>): SolutionFormData {
    const entities: EntityForm[] = [];
    if (Array.isArray(data.entities)) {
        for (const e of data.entities as Record<string, unknown>[]) {
            entities.push({
                name: String(e.name || ""),
                primaryKey: String(e.primaryKey || ""),
                attributesText: Array.isArray(e.attributes)
                    ? (e.attributes as string[]).join("\n")
                    : String(e.attributes || ""),
            });
        }
    }

    const relationships: RelationshipForm[] = [];
    if (Array.isArray(data.relationships)) {
        for (const r of data.relationships as Record<string, unknown>[]) {
            relationships.push({
                from: String(r.from || ""),
                to: String(r.to || ""),
                cardinality: String(r.cardinality || ""),
                description: String(r.description || ""),
            });
        }
    }

    return {
        entities,
        relationships,
        normalizationNotes: String(data.normalizationNotes || ""),
        constraints: Array.isArray(data.constraints)
            ? (data.constraints as string[]).map(String)
            : [],
    };
}

function formToJson(form: SolutionFormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    if (form.entities.length) {
        obj.entities = form.entities
            .filter((e) => e.name.trim())
            .map((e) => ({
                name: e.name.trim(),
                primaryKey: e.primaryKey.trim() || undefined,
                attributes: e.attributesText
                    .split("\n")
                    .map((a) => a.trim())
                    .filter(Boolean),
            }));
    }

    if (form.relationships.length) {
        obj.relationships = form.relationships
            .filter((r) => r.from.trim() && r.to.trim())
            .map((r) => ({
                from: r.from.trim(),
                to: r.to.trim(),
                cardinality: r.cardinality.trim() || undefined,
                description: r.description.trim() || undefined,
            }));
    }

    if (form.normalizationNotes.trim()) {
        obj.normalizationNotes = form.normalizationNotes.trim();
    }

    const constraints = form.constraints.filter(Boolean);
    if (constraints.length) obj.constraints = constraints;

    return obj;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SampleSolutionEditorProps {
    exerciseId: number;
    exerciseSource?: string;
    apiType?: 'admin' | 'instructor';
}

const SampleSolutionEditor = ({ exerciseId, exerciseSource, apiType = 'admin' }: SampleSolutionEditorProps) => {
    const { t } = useTranslation();
    const isManual = exerciseSource !== "AI_GENERATED";

    const [solution, setSolution] = useState<SampleSolution | null>(null);
    const [loading, setLoading] = useState(isManual);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [mode, setMode] = useState<"form" | "raw">("form");
    const [form, setForm] = useState<SolutionFormData>({
        entities: [],
        relationships: [],
        normalizationNotes: "",
        constraints: [],
    });
    const [rawText, setRawText] = useState("{}");
    const [rawError, setRawError] = useState<string | null>(null);

    // ── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isManual) return;
        const load = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const api = apiType === 'instructor' ? instructorSampleSolutionApi : sampleSolutionApi;
                const data = await api.getSampleSolutionByExerciseId(exerciseId);
                setSolution(data);
                const parsed = data.solutionData ?? {};
                setForm(jsonToForm(parsed));
                setRawText(JSON.stringify(parsed, null, 2));
            } catch (err) {
                if (axios.isAxiosError(err) && err.response?.status === 404) {
                    setSolution(null);
                    setForm({ entities: [], relationships: [], normalizationNotes: "", constraints: [] });
                    setRawText("{}");
                } else {
                    setLoadError(t("admin.exercises.sampleSolution.loadError"));
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [exerciseId, isManual, t, apiType]);

    // ── Mode switch ───────────────────────────────────────────────────────────
    const switchToForm = () => {
        try {
            const parsed = JSON.parse(rawText || "{}");
            setForm(jsonToForm(parsed));
            setRawError(null);
            setMode("form");
        } catch {
            setRawError(t("admin.exercises.sampleSolution.validation.solutionJson"));
        }
    };

    const switchToRaw = () => {
        const json = formToJson(form);
        setRawText(JSON.stringify(json, null, 2));
        setRawError(null);
        setMode("raw");
    };

    const handleRawChange = (text: string) => {
        setRawText(text);
        try {
            JSON.parse(text || "{}");
            setRawError(null);
        } catch {
            setRawError(t("admin.exercises.sampleSolution.validation.solutionJson"));
        }
    };

    const handleFormat = () => {
        try {
            const parsed = JSON.parse(rawText || "{}");
            setRawText(JSON.stringify(parsed, null, 2));
            setRawError(null);
        } catch {
            setRawError(t("admin.exercises.sampleSolution.validation.solutionJson"));
        }
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    const getCurrentPayload = (): Record<string, unknown> | null => {
        if (mode === "raw") {
            try {
                return JSON.parse(rawText || "{}");
            } catch {
                setRawError(t("admin.exercises.sampleSolution.validation.solutionJson"));
                return null;
            }
        }
        return formToJson(form);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSuccessMsg(null);

        const payload = getCurrentPayload();
        if (!payload) return;

        try {
            const api = apiType === 'instructor' ? instructorSampleSolutionApi : sampleSolutionApi;
            if (solution?.sampleSolutionId) {
                const updated = await api.updateSampleSolution(
                    solution.sampleSolutionId,
                    { solutionData: payload }
                );
                setSolution(updated);
                const data = updated.solutionData ?? {};
                setForm(jsonToForm(data));
                setRawText(JSON.stringify(data, null, 2));
                setSuccessMsg(t("admin.exercises.sampleSolution.update") + " ✓");
            } else {
                const created = await api.createSampleSolution(exerciseId, {
                    solutionData: payload,
                });
                setSolution(created);
                const data = created.solutionData ?? {};
                setForm(jsonToForm(data));
                setRawText(JSON.stringify(data, null, 2));
                setSuccessMsg(t("admin.exercises.sampleSolution.create") + " ✓");
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const msg = (err.response?.data as { message?: string })?.message;
                setFormError(msg || t("admin.exercises.sampleSolution.saveError"));
            } else {
                setFormError(t("admin.exercises.sampleSolution.saveError"));
            }
        }
    };

    const handleDelete = async () => {
        if (!solution?.sampleSolutionId) return;
        if (!window.confirm(t("admin.exercises.sampleSolution.confirmDelete"))) return;
        setFormError(null);
        setSuccessMsg(null);
        try {
            const api = apiType === 'instructor' ? instructorSampleSolutionApi : sampleSolutionApi;
            await api.deleteSampleSolution(solution.sampleSolutionId);
            setSolution(null);
            setForm({ entities: [], relationships: [], normalizationNotes: "", constraints: [] });
            setRawText("{}");
        } catch {
            setFormError(t("admin.exercises.sampleSolution.deleteError"));
        }
    };

    // ── Entity helpers ────────────────────────────────────────────────────────
    const addEntity = () => {
        setForm((prev) => ({
            ...prev,
            entities: [...prev.entities, { name: "", primaryKey: "", attributesText: "" }],
        }));
    };

    const removeEntity = (idx: number) => {
        setForm((prev) => {
            const list = [...prev.entities];
            list.splice(idx, 1);
            return { ...prev, entities: list };
        });
    };

    const updateEntity = (idx: number, field: keyof EntityForm, val: string) => {
        setForm((prev) => {
            const list = [...prev.entities];
            list[idx] = { ...list[idx], [field]: val };
            return { ...prev, entities: list };
        });
    };

    // ── Relationship helpers ──────────────────────────────────────────────────
    const addRelationship = () => {
        setForm((prev) => ({
            ...prev,
            relationships: [...prev.relationships, { from: "", to: "", cardinality: "", description: "" }],
        }));
    };

    const removeRelationship = (idx: number) => {
        setForm((prev) => {
            const list = [...prev.relationships];
            list.splice(idx, 1);
            return { ...prev, relationships: list };
        });
    };

    const updateRelationship = (idx: number, field: keyof RelationshipForm, val: string) => {
        setForm((prev) => {
            const list = [...prev.relationships];
            list[idx] = { ...list[idx], [field]: val };
            return { ...prev, relationships: list };
        });
    };

    // ── Constraint helpers ────────────────────────────────────────────────────
    const addConstraint = () => {
        setForm((prev) => ({ ...prev, constraints: [...prev.constraints, ""] }));
    };

    const removeConstraint = (idx: number) => {
        setForm((prev) => {
            const list = [...prev.constraints];
            list.splice(idx, 1);
            return { ...prev, constraints: list };
        });
    };

    const updateConstraint = (idx: number, val: string) => {
        setForm((prev) => {
            const list = [...prev.constraints];
            list[idx] = val;
            return { ...prev, constraints: list };
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (!isManual) {
        return (
            <div className="info-notice">
                <span className="info-notice__icon">ℹ️</span>
                <span>{t("admin.exercises.sampleSolution.notApplicable")}</span>
            </div>
        );
    }

    if (loading) return <p className="loading-text">{t("admin.exercises.sampleSolution.loading")}</p>;
    if (loadError) return <div className="alert">{loadError}</div>;

    return (
        <div className="solution-editor">
            {/* Mode toggle */}
            <div className="editor-mode-bar">
                <button
                    type="button"
                    className={`editor-mode-btn ${mode === "form" ? "active" : ""}`}
                    onClick={mode === "raw" ? switchToForm : undefined}
                >
                    {t("admin.exercises.solutionEditor.formMode")}
                </button>
                <button
                    type="button"
                    className={`editor-mode-btn ${mode === "raw" ? "active" : ""}`}
                    onClick={mode === "form" ? switchToRaw : undefined}
                >
                    {t("admin.exercises.solutionEditor.rawMode")}
                </button>
            </div>

            {formError && <div className="alert">{formError}</div>}
            {successMsg && <div className="alert alert--success">{successMsg}</div>}

            {!solution && (
                <div className="info-notice info-notice--soft" style={{ marginBottom: 12 }}>
                    {t("admin.exercises.sampleSolution.noSolution")}
                </div>
            )}

            <form onSubmit={handleSave}>
                {mode === "form" ? (
                    <div className="solution-form">
                        {/* Entities */}
                        <div className="form-section">
                            <div className="form-section__header">
                                <span className="form-section__label">
                                    {t("admin.exercises.solutionEditor.entities")}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={addEntity}
                                >
                                    {t("admin.exercises.solutionEditor.addEntity")}
                                </button>
                            </div>
                            {form.entities.map((entity, idx) => (
                                <div key={idx} className="entity-card">
                                    <div className="entity-card__header">
                                        <span className="entity-card__index">Entity #{idx + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-icon btn-icon--danger"
                                            onClick={() => removeEntity(idx)}
                                            title="Xóa entity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="entity-card__body">
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.entityName")}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={entity.name}
                                                placeholder={t("admin.exercises.solutionEditor.entityNamePlaceholder")}
                                                onChange={(e) => updateEntity(idx, "name", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.primaryKey")}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={entity.primaryKey}
                                                placeholder={t("admin.exercises.solutionEditor.primaryKeyPlaceholder")}
                                                onChange={(e) => updateEntity(idx, "primaryKey", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.attributes")}</label>
                                            <textarea
                                                className="textarea"
                                                rows={3}
                                                value={entity.attributesText}
                                                placeholder={t("admin.exercises.solutionEditor.attributesPlaceholder")}
                                                onChange={(e) => updateEntity(idx, "attributesText", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Relationships */}
                        <div className="form-section">
                            <div className="form-section__header">
                                <span className="form-section__label">
                                    {t("admin.exercises.solutionEditor.relationships")}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={addRelationship}
                                >
                                    {t("admin.exercises.solutionEditor.addRelationship")}
                                </button>
                            </div>
                            {form.relationships.map((rel, idx) => (
                                <div key={idx} className="relationship-card">
                                    <div className="entity-card__header">
                                        <span className="entity-card__index">Rel #{idx + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-icon btn-icon--danger"
                                            onClick={() => removeRelationship(idx)}
                                            title="Xóa relationship"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="relationship-grid">
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.relFrom")}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={rel.from}
                                                onChange={(e) => updateRelationship(idx, "from", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.relTo")}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={rel.to}
                                                onChange={(e) => updateRelationship(idx, "to", e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>{t("admin.exercises.solutionEditor.relCardinality")}</label>
                                            <select
                                                className="input"
                                                value={rel.cardinality}
                                                onChange={(e) => updateRelationship(idx, "cardinality", e.target.value)}
                                            >
                                                <option value="">—</option>
                                                <option value="1-1">1-1</option>
                                                <option value="1-N">1-N</option>
                                                <option value="N-1">N-1</option>
                                                <option value="N-N">N-N</option>
                                            </select>
                                        </div>
                                        <div className="form-field" style={{ gridColumn: "span 3" }}>
                                            <label>{t("admin.exercises.solutionEditor.relDescription")}</label>
                                            <input
                                                className="input"
                                                type="text"
                                                value={rel.description}
                                                placeholder={t("admin.exercises.solutionEditor.relDescriptionPlaceholder")}
                                                onChange={(e) => updateRelationship(idx, "description", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Normalization Notes */}
                        <div className="form-field">
                            <label>{t("admin.exercises.solutionEditor.normalizationNotes")}</label>
                            <textarea
                                className="textarea"
                                rows={3}
                                value={form.normalizationNotes}
                                placeholder={t("admin.exercises.solutionEditor.normalizationNotesPlaceholder")}
                                onChange={(e) => setForm((prev) => ({ ...prev, normalizationNotes: e.target.value }))}
                            />
                        </div>

                        {/* Constraints */}
                        <div className="form-section">
                            <div className="form-section__header">
                                <span className="form-section__label">
                                    {t("admin.exercises.solutionEditor.constraints")}
                                </span>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={addConstraint}
                                >
                                    {t("admin.exercises.solutionEditor.addConstraint")}
                                </button>
                            </div>
                            {form.constraints.map((c, idx) => (
                                <div key={idx} className="dynamic-list-row">
                                    <input
                                        className="input"
                                        type="text"
                                        value={c}
                                        placeholder={t("admin.exercises.solutionEditor.constraintPlaceholder")}
                                        onChange={(e) => updateConstraint(idx, e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn-icon btn-icon--danger"
                                        onClick={() => removeConstraint(idx)}
                                        title="Xóa"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="form-field">
                        <textarea
                            className="textarea textarea--code"
                            rows={14}
                            placeholder={t("admin.exercises.solutionEditor.rawPlaceholder")}
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
                                {t("admin.exercises.solutionEditor.formatJson")}
                            </button>
                        </div>
                        {rawError && <div className="alert">{rawError}</div>}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button type="submit" className="btn btn-primary">
                        {solution?.sampleSolutionId
                            ? t("admin.exercises.sampleSolution.update")
                            : t("admin.exercises.sampleSolution.create")}
                    </button>
                    {solution?.sampleSolutionId && (
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleDelete}
                        >
                            {t("admin.exercises.sampleSolution.delete")}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default SampleSolutionEditor;
