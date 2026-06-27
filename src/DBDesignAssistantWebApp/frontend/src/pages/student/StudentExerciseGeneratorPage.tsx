import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import { studentExerciseApi } from "../../services/studentExerciseApi";
import { studentSubmissionApi } from "../../services/studentSubmissionApi";
import type { Exercise, ExerciseGenerationResponse } from "../../types";
import "./StudentExerciseGeneratorPage.css";

type GeneratorForm = {
    topic: string;
    difficulty: string;
    businessDomain: string;
    keywords: string;
    baseExerciseId: string;
    additionalRequirements: string;
};

type PracticeStartTab = "manual" | "ai";

const initialForm: GeneratorForm = {
    topic: "",
    difficulty: "MEDIUM",
    businessDomain: "",
    keywords: "",
    baseExerciseId: "",
    additionalRequirements: "",
};

const difficultyOptions = [
    { value: "EASY", label: "Cơ bản" },
    { value: "MEDIUM", label: "Trung bình" },
    { value: "HARD", label: "Nâng cao" },
];

const StudentExerciseGeneratorPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [form, setForm] = useState<GeneratorForm>(initialForm);
    const [sampleExercises, setSampleExercises] = useState<Exercise[]>([]);
    const [loadingSamples, setLoadingSamples] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startingDraft, setStartingDraft] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generated, setGenerated] = useState<ExerciseGenerationResponse | null>(null);
    const [activeTab, setActiveTab] = useState<PracticeStartTab>("ai");

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
        const id = Number(form.baseExerciseId);
        if (!Number.isFinite(id)) {
            return null;
        }
        return sampleExercises.find((exercise) => exercise.exerciseId === id) ?? null;
    }, [form.baseExerciseId, sampleExercises]);

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const data = await studentExerciseApi.generate({
                topic: toOptional(form.topic),
                difficulty: form.difficulty,
                businessDomain: toOptional(form.businessDomain),
                keywords: toOptional(form.keywords),
                baseExerciseId: form.baseExerciseId ? Number(form.baseExerciseId) : null,
                additionalRequirements: toOptional(form.additionalRequirements),
            });
            setGenerated(data);
        } catch (requestError) {
            const message = requestError instanceof Error
                ? requestError.message
                : "Không thể sinh bài tập. Vui lòng thử lại.";
            setError(message);
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
            const message = requestError instanceof Error
                ? requestError.message
                : "Không thể tạo bản nháp. Vui lòng thử lại.";
            setError(message);
        } finally {
            setStartingDraft(false);
        }
    };

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const scenario = generated?.scenarioData ?? {};

    return (
        <StudentLayout
            title="Bắt đầu thực hành"
            subtitle="Chọn hoặc tạo đề bài trước khi vào workspace thiết kế CSDL"
            onSignOut={handleSignOut}
        >
            <div className="page-header">
                <div>
                    <h2>Khu vực bắt đầu thực hành</h2>
                    <p className="muted-text">
                        Sau khi có đề bài, bấm Làm bài để tạo bản nháp thật và vào workspace production.
                    </p>
                </div>
                <button className="btn btn-outline" onClick={() => navigate("/student/exercises")}>
                    Danh sách bài tập
                </button>
            </div>

            <div className="practice-start-tabs" role="tablist" aria-label="Chọn cách bắt đầu thực hành">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "ai"}
                    className={`practice-start-tab${activeTab === "ai" ? " practice-start-tab--active" : ""}`}
                    onClick={() => setActiveTab("ai")}
                >
                    Sinh bài tập AI
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "manual"}
                    className={`practice-start-tab${activeTab === "manual" ? " practice-start-tab--active" : ""}`}
                    onClick={() => setActiveTab("manual")}
                >
                    Nhập đề bài
                </button>
            </div>

            {activeTab === "ai" ? (
                <div className="exercise-generator-grid">
                    <form className="section-card" onSubmit={handleSubmit}>
                        <div className="card-body">
                            <div className="practice-note">
                                <strong>Sinh đề bài riêng</strong>
                                <span>Đề bài được tạo từ KnowledgeBase đã duyệt và các bài mẫu đã xuất bản.</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="topic">Chủ đề</label>
                                <input
                                    id="topic"
                                    name="topic"
                                    className="input"
                                    value={form.topic}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: ERD, chuẩn hóa, quan hệ n-n"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="difficulty">Độ khó</label>
                                <select
                                    id="difficulty"
                                    name="difficulty"
                                    className="input"
                                    value={form.difficulty}
                                    onChange={handleChange}
                                    required
                                >
                                    {difficultyOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="businessDomain">Lĩnh vực / ngữ cảnh</label>
                                <input
                                    id="businessDomain"
                                    name="businessDomain"
                                    className="input"
                                    value={form.businessDomain}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: phòng khám, thư viện, nhà hàng"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="keywords">Từ khóa</label>
                                <input
                                    id="keywords"
                                    name="keywords"
                                    className="input"
                                    value={form.keywords}
                                    onChange={handleChange}
                                    placeholder="customer, booking, invoice"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="baseExerciseId">Bài mẫu</label>
                                <select
                                    id="baseExerciseId"
                                    name="baseExerciseId"
                                    className="input"
                                    value={form.baseExerciseId}
                                    onChange={handleChange}
                                    disabled={loadingSamples}
                                >
                                    <option value="">Tự chọn theo ngữ cảnh phù hợp</option>
                                    {sampleExercises.map((exercise) => (
                                        <option key={exercise.exerciseId} value={exercise.exerciseId}>
                                            {exercise.exerciseCode ? `${exercise.exerciseCode} - ` : ""}
                                            {exercise.exTitle}
                                        </option>
                                    ))}
                                </select>
                                {selectedBaseExercise ? (
                                    <p className="muted-text">Đang dựa trên: {selectedBaseExercise.exTitle}</p>
                                ) : null}
                            </div>

                            <div className="form-group">
                                <label htmlFor="additionalRequirements">Yêu cầu bổ sung</label>
                                <textarea
                                    id="additionalRequirements"
                                    name="additionalRequirements"
                                    className="input"
                                    rows={4}
                                    value={form.additionalRequirements}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: cần có lịch sử giao dịch, ràng buộc trạng thái, báo cáo thống kê"
                                />
                            </div>

                            {error ? <div className="alert alert-error">{error}</div> : null}

                            <button className="btn btn-primary" type="submit" disabled={submitting}>
                                {submitting ? "Đang sinh bài tập..." : "Sinh bài tập"}
                            </button>
                        </div>
                    </form>

                    <section className="section-card">
                        <div className="card-body">
                            {generated ? (
                                <div className="generated-exercise">
                                    <div className="badge-row">
                                        <span className="status-badge status-badge--info">{generated.exerciseSource}</span>
                                        <span className="status-badge">{generated.exerciseCode}</span>
                                    </div>
                                    <h3>{generated.title}</h3>
                                    <p>{generated.description}</p>

                                    <GeneratedSection title="Bối cảnh nghiệp vụ" value={scenario.businessContext} />
                                    <GeneratedList title="Yêu cầu chức năng" value={scenario.functionalRequirements} />
                                    <GeneratedList title="Ràng buộc dữ liệu" value={scenario.dataConstraints} />
                                    <GeneratedList title="Gợi ý phạm vi thiết kế" value={scenario.designScopeHints} />

                                    <div className="action-group">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleStartGeneratedExercise}
                                            disabled={startingDraft}
                                        >
                                            {startingDraft ? "Đang tạo bản nháp..." : "Làm bài"}
                                        </button>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => navigate(`/student/exercises/${generated.exerciseId}`)}
                                        >
                                            Xem chi tiết
                                        </button>
                                    </div>

                                    <details className="json-details">
                                        <summary>Scenario JSON</summary>
                                        <pre>{JSON.stringify(generated.scenarioData, null, 2)}</pre>
                                    </details>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <h3>Chưa có đề bài</h3>
                                    <p>Điền form và bấm Sinh bài tập để tạo đề thực hành mới.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            ) : (
                <section className="section-card manual-practice-placeholder">
                    <div className="card-body">
                        <div>
                            <h3>Nhập đề bài riêng</h3>
                            <p className="muted-text">
                                Flow này sẽ cho phép sinh viên dán đề bài, khóa đề, rồi bấm Làm bài để tạo bản nháp production.
                            </p>
                        </div>
                        <textarea
                            className="input"
                            rows={8}
                            placeholder="Dán mô tả nghiệp vụ cần thiết kế ERD..."
                            disabled
                        />
                        <div className="practice-note practice-note--warning">
                            <strong>TODO</strong>
                            <span>Chưa có backend tạo exercise từ đề bài nhập tay trong production, nên tạm thời chưa tạo bản nháp.</span>
                        </div>
                    </div>
                </section>
            )}
        </StudentLayout>
    );
};

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
    const items = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="generated-section">
            <h4>{title}</h4>
            <ul>
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </section>
    );
};

const toOptional = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

export default StudentExerciseGeneratorPage;
