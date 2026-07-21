import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eye, Play, Plus } from "lucide-react";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Exercise, ExerciseGenerationResponse } from "../../types";
import "./StudentExerciseGeneratorPage.css";

type AiGeneratorForm = {
    topic: string;
    difficulty: string;
    businessDomain: string;
    keywords: string;
    baseExerciseId: string;
    additionalRequirements: string;
};

type ManualPromptForm = {
    customPrompt: string;
    difficulty: string;
    businessDomain: string;
    additionalRequirements: string;
};

type PracticeStartTab = "manual" | "ai";

type ApiErrorLike = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

const initialAiForm: AiGeneratorForm = {
    topic: "",
    difficulty: "MEDIUM",
    businessDomain: "",
    keywords: "",
    baseExerciseId: "",
    additionalRequirements: "",
};

const initialManualForm: ManualPromptForm = {
    customPrompt: "",
    difficulty: "MEDIUM",
    businessDomain: "",
    additionalRequirements: "",
};

const initialGeneratedByTab: Record<PracticeStartTab, ExerciseGenerationResponse | null> = {
    ai: null,
    manual: null,
};

const StudentExerciseGeneratorPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [aiForm, setAiForm] = useState<AiGeneratorForm>(initialAiForm);
    const [manualForm, setManualForm] = useState<ManualPromptForm>(initialManualForm);
    const [sampleExercises, setSampleExercises] = useState<Exercise[]>([]);
    const [loadingSamples, setLoadingSamples] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startingDraft, setStartingDraft] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedByTab, setGeneratedByTab] = useState(initialGeneratedByTab);
    const [activeTab, setActiveTab] = useState<PracticeStartTab>("ai");

    const difficultyOptions = [
        { value: "EASY", label: t("student.exerciseGenerator.difficulty.easy") },
        { value: "MEDIUM", label: t("student.exerciseGenerator.difficulty.medium") },
        { value: "HARD", label: t("student.exerciseGenerator.difficulty.hard") },
    ];

    useEffect(() => {
        let isCancelled = false;

        const loadSamples = async () => {
            try {
                const exercises = await studentExerciseApi.getAll();
                if (!isCancelled) {
                    setSampleExercises(exercises.filter((exercise) => exercise.exerciseSource !== "AI_GENERATED"));
                }
            } catch {
                if (!isCancelled) {
                    setSampleExercises([]);
                }
            } finally {
                if (!isCancelled) {
                    setLoadingSamples(false);
                }
            }
        };

        loadSamples();
        return () => {
            isCancelled = true;
        };
    }, []);

    const selectedBaseExercise = useMemo(() => {
        const id = Number(aiForm.baseExerciseId);
        if (!Number.isFinite(id)) {
            return null;
        }
        return sampleExercises.find((exercise) => exercise.exerciseId === id) ?? null;
    }, [aiForm.baseExerciseId, sampleExercises]);

    const generated = generatedByTab[activeTab];
    const scenario = generated?.scenarioData ?? {};

    const handleAiChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setAiForm((current) => ({ ...current, [name]: value }));
    };

    const handleManualChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setManualForm((current) => ({ ...current, [name]: value }));
    };

    const handleTabChange = (tab: PracticeStartTab) => {
        setActiveTab(tab);
        setError(null);
    };

    const handleAiSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const data = await studentExerciseApi.generate({
                topic: toOptional(aiForm.topic),
                difficulty: aiForm.difficulty,
                businessDomain: toOptional(aiForm.businessDomain),
                keywords: toOptional(aiForm.keywords),
                baseExerciseId: aiForm.baseExerciseId ? Number(aiForm.baseExerciseId) : null,
                additionalRequirements: toOptional(aiForm.additionalRequirements),
            });
            setGeneratedByTab((current) => ({ ...current, ai: data }));
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("student.exerciseGenerator.errors.generate")));
        } finally {
            setSubmitting(false);
        }
    };

    const handleManualSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const customPrompt = manualForm.customPrompt.trim();
        if (!customPrompt) {
            setError(t("student.exerciseGenerator.errors.manualPromptRequired"));
            return;
        }

        setError(null);
        setSubmitting(true);
        try {
            const data = await studentExerciseApi.generate({
                customPrompt,
                businessContext: customPrompt,
                difficulty: manualForm.difficulty,
                businessDomain: toOptional(manualForm.businessDomain),
                additionalRequirements: toOptional(manualForm.additionalRequirements),
            });
            setGeneratedByTab((current) => ({ ...current, manual: data }));
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("student.exerciseGenerator.errors.generate")));
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartGeneratedExercise = async () => {
        if (!generated) {
            return;
        }

        setError(null);
        setStartingDraft(true);
        try {
            const draft = await studentSubmissionApi.createDraft(generated.exerciseId);
            navigate(`/student/workspace/${draft.submissionId}`);
        } catch (requestError) {
            setError(getErrorMessage(requestError, t("student.exerciseGenerator.errors.createDraft")));
        } finally {
            setStartingDraft(false);
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <StudentLayout
            title={t("student.exerciseGenerator.title")}
            subtitle={t("student.exerciseGenerator.subtitle")}
            onSignOut={handleSignOut}
        >
            <div className="page-header">
                <div>
                    <h2>{t("student.exerciseGenerator.headerTitle")}</h2>
                    <p className="muted-text">{t("student.exerciseGenerator.headerSubtitle")}</p>
                </div>
            </div>

            <div
                className="practice-start-tabs"
                role="tablist"
                aria-label={t("student.exerciseGenerator.tabs.ariaLabel")}
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "ai"}
                    className={`practice-start-tab${activeTab === "ai" ? " practice-start-tab--active" : ""}`}
                    onClick={() => handleTabChange("ai")}
                >
                    {t("student.exerciseGenerator.tabs.ai")}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "manual"}
                    className={`practice-start-tab${activeTab === "manual" ? " practice-start-tab--active" : ""}`}
                    onClick={() => handleTabChange("manual")}
                >
                    {t("student.exerciseGenerator.tabs.manual")}
                </button>
            </div>

            <div className="exercise-generator-grid">
                {activeTab === "ai" ? (
                    <form className="section-card" onSubmit={handleAiSubmit}>
                        <div className="card-body">
                            <div className="form-group">
                                <label htmlFor="topic">{t("student.exerciseGenerator.fields.topic")}</label>
                                <input
                                    id="topic"
                                    name="topic"
                                    className="input"
                                    value={aiForm.topic}
                                    onChange={handleAiChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.topic")}
                                />
                            </div>

                            <DifficultySelect
                                id="aiDifficulty"
                                name="difficulty"
                                value={aiForm.difficulty}
                                options={difficultyOptions}
                                label={t("student.exerciseGenerator.fields.difficulty")}
                                onChange={handleAiChange}
                            />

                            <div className="form-group">
                                <label htmlFor="businessDomain">{t("student.exerciseGenerator.fields.businessDomain")}</label>
                                <input
                                    id="businessDomain"
                                    name="businessDomain"
                                    className="input"
                                    value={aiForm.businessDomain}
                                    onChange={handleAiChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.businessDomain")}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="keywords">{t("student.exerciseGenerator.fields.keywords")}</label>
                                <input
                                    id="keywords"
                                    name="keywords"
                                    className="input"
                                    value={aiForm.keywords}
                                    onChange={handleAiChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.keywords")}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="baseExerciseId">{t("student.exerciseGenerator.fields.baseExercise")}</label>
                                <select
                                    id="baseExerciseId"
                                    name="baseExerciseId"
                                    className="input"
                                    value={aiForm.baseExerciseId}
                                    onChange={handleAiChange}
                                    disabled={loadingSamples}
                                >
                                    <option value="">{t("student.exerciseGenerator.fields.baseExerciseAuto")}</option>
                                    {sampleExercises.map((exercise) => (
                                        <option key={exercise.exerciseId} value={exercise.exerciseId}>
                                            {exercise.exerciseCode ? `${exercise.exerciseCode} - ` : ""}
                                            {exercise.exTitle}
                                        </option>
                                    ))}
                                </select>
                                {selectedBaseExercise ? (
                                    <p className="muted-text">
                                        {t("student.exerciseGenerator.fields.selectedBase", {
                                            title: selectedBaseExercise.exTitle,
                                        })}
                                    </p>
                                ) : null}
                            </div>

                            <div className="form-group">
                                <label htmlFor="additionalRequirements">
                                    {t("student.exerciseGenerator.fields.additionalRequirements")}
                                </label>
                                <textarea
                                    id="additionalRequirements"
                                    name="additionalRequirements"
                                    className="input"
                                    rows={4}
                                    value={aiForm.additionalRequirements}
                                    onChange={handleAiChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.additionalRequirements")}
                                />
                            </div>

                            {error ? <div className="alert alert-error">{error}</div> : null}

                            <button className="btn btn-primary" type="submit" disabled={submitting}>
                                <Plus size={16} aria-hidden="true" />
                                {submitting
                                    ? t("student.exerciseGenerator.actions.generating")
                                    : t("student.exerciseGenerator.actions.generate")}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="section-card manual-practice-form" onSubmit={handleManualSubmit}>
                        <div className="card-body">
                            <div className="form-group">
                                <label htmlFor="customPrompt">{t("student.exerciseGenerator.fields.customPrompt")}</label>
                                <textarea
                                    id="customPrompt"
                                    name="customPrompt"
                                    className="input manual-prompt-textarea"
                                    rows={9}
                                    value={manualForm.customPrompt}
                                    onChange={handleManualChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.customPrompt")}
                                    required
                                />
                            </div>

                            <DifficultySelect
                                id="manualDifficulty"
                                name="difficulty"
                                value={manualForm.difficulty}
                                options={difficultyOptions}
                                label={t("student.exerciseGenerator.fields.difficulty")}
                                onChange={handleManualChange}
                            />

                            <div className="form-group">
                                <label htmlFor="manualBusinessDomain">
                                    {t("student.exerciseGenerator.fields.businessDomainOptional")}
                                </label>
                                <input
                                    id="manualBusinessDomain"
                                    name="businessDomain"
                                    className="input"
                                    value={manualForm.businessDomain}
                                    onChange={handleManualChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.manualBusinessDomain")}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="manualAdditionalRequirements">
                                    {t("student.exerciseGenerator.fields.additionalRequirements")}
                                </label>
                                <textarea
                                    id="manualAdditionalRequirements"
                                    name="additionalRequirements"
                                    className="input"
                                    rows={3}
                                    value={manualForm.additionalRequirements}
                                    onChange={handleManualChange}
                                    placeholder={t("student.exerciseGenerator.placeholders.manualAdditionalRequirements")}
                                />
                            </div>

                            {error ? <div className="alert alert-error">{error}</div> : null}

                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={submitting || manualForm.customPrompt.trim().length === 0}
                            >
                                <Plus size={16} aria-hidden="true" />
                                {submitting
                                    ? t("student.exerciseGenerator.actions.generating")
                                    : t("student.exerciseGenerator.actions.generateFromPrompt")}
                            </button>
                        </div>
                    </form>
                )}

                <section className="section-card">
                    <div className="card-body">
                        {generated ? (
                            <div className="generated-exercise">
                                <div className="badge-row">
                                    <span className="status-badge">{generated.exerciseCode}</span>
                                </div>
                                <h3>{generated.title}</h3>
                                <p>{generated.description}</p>

                                <GeneratedSection
                                    title={t("student.exerciseGenerator.result.businessContext")}
                                    value={getScenarioValue(scenario, ["businessContext", "context", "problemContext"])}
                                />
                                <GeneratedList
                                    title={t("student.exerciseGenerator.result.requirements")}
                                    value={getScenarioValue(scenario, ["requirements", "functionalRequirements", "businessRequirements"])}
                                />
                                <GeneratedList
                                    title={t("student.exerciseGenerator.result.constraints")}
                                    value={getScenarioValue(scenario, ["constraints", "dataConstraints", "businessRules"])}
                                />
                                <GeneratedList
                                    title={t("student.exerciseGenerator.result.designHints")}
                                    value={getScenarioValue(scenario, ["designScopeHints", "scopeHints"])}
                                />

                                <div className="action-group">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleStartGeneratedExercise}
                                        disabled={startingDraft}
                                        type="button"
                                    >
                                        <Play size={16} aria-hidden="true" />
                                        {startingDraft
                                            ? t("student.exerciseGenerator.actions.startingDraft")
                                            : t("student.exerciseGenerator.actions.start")}
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => navigate(`/student/exercises/${generated.exerciseId}`)}
                                        type="button"
                                    >
                                        <Eye size={16} aria-hidden="true" />
                                        {t("student.exerciseGenerator.actions.viewDetail")}
                                    </button>
                                </div>

                                <details className="json-details">
                                    <summary>{t("student.exerciseGenerator.result.scenarioJson")}</summary>
                                    <pre>{JSON.stringify(generated.scenarioData, null, 2)}</pre>
                                </details>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <h3>{t("student.exerciseGenerator.empty.title")}</h3>
                                <p>{t(`student.exerciseGenerator.empty.${activeTab}`)}</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </StudentLayout>
    );
};

type DifficultySelectProps = {
    id: string;
    name: string;
    value: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

const DifficultySelect = ({ id, name, value, label, options, onChange }: DifficultySelectProps) => (
    <div className="form-group">
        <label htmlFor={id}>{label}</label>
        <select id={id} name={name} className="input" value={value} onChange={onChange} required>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </div>
);

const GeneratedSection = ({ title, value }: { title: string; value: unknown }) => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    return (
        <section className="generated-section">
            <h4>{title}</h4>
            <p>{value}</p>
        </section>
    );
};

const GeneratedList = ({ title, value }: { title: string; value: unknown }) => {
    const items = toTextList(value);

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="generated-section">
            <h4>{title}</h4>
            <ul>
                {items.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                ))}
            </ul>
        </section>
    );
};

const toOptional = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const getScenarioValue = (scenario: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = scenario[key];
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
};

const toTextList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => {
            if (typeof item === "string" || typeof item === "number") {
                const text = String(item).trim();
                return text ? [text] : [];
            }
            return [];
        });
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null) {
        const candidate = error as ApiErrorLike;
        return candidate.response?.data?.message || candidate.message || fallback;
    }
    return fallback;
};

export default StudentExerciseGeneratorPage;
