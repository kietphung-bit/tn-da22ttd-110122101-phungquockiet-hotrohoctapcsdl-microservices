import { useState } from "react";
import type { FormEvent } from "react";
import { demoExercise } from "../services/demoAiResponses";
import type { DemoProblem } from "../services/demoAiResponses";

type DemoProblemSetupTabsProps = {
    isLocked: boolean;
    selectedProblem: DemoProblem | null;
    onSelectProblem: (problem: DemoProblem) => void;
    onStartPractice: () => void;
    onResetAll: () => void;
};

const difficultyOptions = ["Dễ", "Trung bình", "Khó"] as const;

const estimateByDifficulty: Record<string, string> = {
    "Dễ": "20-30 phút",
    "Trung bình": "30-45 phút",
    "Khó": "45-60 phút",
};

const DemoProblemSetupTabs = ({
    isLocked,
    selectedProblem,
    onSelectProblem,
    onStartPractice,
    onResetAll,
}: DemoProblemSetupTabsProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const [activeTab, setActiveTab] = useState<"manual" | "generate">("manual");

    const [manualContent, setManualContent] = useState("");
    const [manualTopic, setManualTopic] = useState("");
    const [manualDifficulty, setManualDifficulty] = useState("");
    const [manualNotes, setManualNotes] = useState("");
    const [manualError, setManualError] = useState<string | null>(null);

    const [difficulty, setDifficulty] = useState<string>(difficultyOptions[1]);
    const [keywords, setKeywords] = useState("");
    const [context, setContext] = useState("");

    const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLocked) return;

        const trimmedContent = manualContent.trim();
        if (!trimmedContent) {
            setManualError("Vui lòng nhập nội dung đề bài.");
            return;
        }

        setManualError(null);
        onSelectProblem({
            source: "manual",
            title: manualTopic.trim() || "Đề bài tự nhập",
            overview: trimmedContent,
            requirements: [],
            constraints: [],
            meta: {
                topic: manualTopic.trim() || undefined,
                difficulty: manualDifficulty.trim() || undefined,
                notes: manualNotes.trim() || undefined,
            },
        });
    };

    const handleGenerate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLocked) return;

        const estimatedTime = estimateByDifficulty[difficulty] ?? demoExercise.estimatedTime;

        onSelectProblem({
            source: "generated",
            title: demoExercise.title,
            overview: demoExercise.overview,
            requirements: demoExercise.requirements,
            constraints: demoExercise.constraints,
            meta: {
                difficulty,
                keywords: keywords.trim() || undefined,
                context: context.trim() || undefined,
                estimatedTime,
                sourceLabel: "Demo cố định - chưa gọi AI thật",
            },
        });
    };

    const problemMetaItems = selectedProblem
        ? [
              selectedProblem.meta?.topic ? `Chủ đề: ${selectedProblem.meta.topic}` : null,
              selectedProblem.meta?.difficulty
                  ? `Độ khó: ${selectedProblem.meta.difficulty}`
                  : null,
              selectedProblem.meta?.keywords
                  ? `Từ khóa: ${selectedProblem.meta.keywords}`
                  : null,
              selectedProblem.meta?.context
                  ? `Ngữ cảnh: ${selectedProblem.meta.context}`
                  : null,
              selectedProblem.meta?.estimatedTime
                  ? `Thời lượng: ${selectedProblem.meta.estimatedTime}`
                  : null,
          ].filter((item): item is string => Boolean(item))
        : [];

    return (
        <section className="section-card demo-section">
            <div className="demo-section__header">
                <div>
                    <h3 className="demo-section__title">Đề bài thực hành</h3>
                    <p className="demo-section__subtitle">
                        Chọn nhập tay hoặc sinh bài demo để bắt đầu thực hành.
                    </p>
                </div>
                <div className="demo-badge-row">
                    <span className="demo-badge">Demo workflow</span>
                    {isLocked && <span className="demo-badge demo-badge--lock">Đã khóa</span>}
                </div>
            </div>

            {isLocked && (
                <div className="demo-lock-banner">
                    Đã bắt đầu làm bài. Khu vực đề bài đang bị khóa.
                </div>
            )}

            <div className="demo-tabs">
                <button
                    type="button"
                    className={`demo-tab${activeTab === "manual" ? " demo-tab--active" : ""}`}
                    onClick={() => !isLocked && setActiveTab("manual")}
                    disabled={isLocked}
                >
                    Nhập đề bài
                </button>
                <button
                    type="button"
                    className={`demo-tab${activeTab === "generate" ? " demo-tab--active" : ""}`}
                    onClick={() => !isLocked && setActiveTab("generate")}
                    disabled={isLocked}
                >
                    Tạo bài tập
                </button>
            </div>

            {activeTab === "manual" ? (
                <form className="demo-form" onSubmit={handleManualSubmit}>
                    <div className="form-field">
                        <label>Nội dung đề bài</label>
                        <textarea
                            className="textarea"
                            rows={4}
                            placeholder="Dán hoặc nhập đề bài thực hành"
                            value={manualContent}
                            onChange={(event) => setManualContent(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    <div className="demo-form__grid">
                        <div className="form-field">
                            <label>Chủ đề (tuỳ chọn)</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="VD: Quản lý nhà hàng"
                                value={manualTopic}
                                onChange={(event) => setManualTopic(event.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                        <div className="form-field">
                            <label>Độ khó (tuỳ chọn)</label>
                            <select
                                className="input"
                                value={manualDifficulty}
                                onChange={(event) => setManualDifficulty(event.target.value)}
                                disabled={isLocked}
                            >
                                <option value="">Chọn độ khó</option>
                                {difficultyOptions.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-field">
                        <label>Ghi chú (tuỳ chọn)</label>
                        <textarea
                            className="textarea"
                            rows={2}
                            placeholder="VD: Nhấn mạnh về cardinality và 1NF"
                            value={manualNotes}
                            onChange={(event) => setManualNotes(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    <div className="demo-form__actions">
                        <button type="submit" className="btn btn-primary" disabled={isLocked}>
                            Dùng đề bài này
                        </button>
                        <span className="demo-form__note">Nhập đề bài và nhấn để sử dụng.</span>
                    </div>
                    {manualError && <div className="demo-form__error">{manualError}</div>}
                </form>
            ) : (
                <form className="demo-form" onSubmit={handleGenerate}>
                    <div className="demo-tab-badge">Demo cố định - chưa gọi AI thật</div>
                    <div className="demo-form__grid">
                        <div className="form-field">
                            <label>Độ khó</label>
                            <select
                                className="input"
                                value={difficulty}
                                onChange={(event) => setDifficulty(event.target.value)}
                                disabled={isLocked}
                            >
                                {difficultyOptions.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Từ khóa chính</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="VD: thư viện, mượn sách, độc giả"
                                value={keywords}
                                onChange={(event) => setKeywords(event.target.value)}
                                disabled={isLocked}
                            />
                        </div>
                    </div>
                    <div className="form-field">
                        <label>Ngữ cảnh / mục tiêu</label>
                        <textarea
                            className="textarea"
                            rows={3}
                            placeholder="VD: Cần tối ưu quy trình mượn trả và theo dõi tình trạng sách"
                            value={context}
                            onChange={(event) => setContext(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    <div className="demo-form__actions">
                        <button type="submit" className="btn btn-primary" disabled={isLocked}>
                            Sinh bài tập bằng AI
                        </button>
                        <span className="demo-form__note">
                            Đầu vào chỉ để demo, nội dung là cố định.
                        </span>
                    </div>
                </form>
            )}

            {selectedProblem ? (
                <div className="demo-exercise-card">
                    <div className="demo-problem-header">
                        <div className="demo-exercise-title">{selectedProblem.title}</div>
                        <span className="demo-badge">
                            {selectedProblem.source === "manual" ? "Đề nhập tay" : "Đề demo AI"}
                        </span>
                    </div>
                    <p className="demo-muted">{selectedProblem.overview}</p>
                    {problemMetaItems.length > 0 && (
                        <div className="demo-exercise-meta">
                            {problemMetaItems.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                        </div>
                    )}
                    {selectedProblem.meta?.notes && (
                        <div className="demo-note">Ghi chú: {selectedProblem.meta.notes}</div>
                    )}
                    <div className="demo-exercise-grid">
                        <div>
                            <h4 className="demo-block-title">Yêu cầu nghiệp vụ</h4>
                            {selectedProblem.requirements.length === 0 ? (
                                <div className="demo-muted">Chưa tách yêu cầu từ đề bài.</div>
                            ) : (
                                <ul className="demo-exercise-list">
                                    {selectedProblem.requirements.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <h4 className="demo-block-title">Ràng buộc</h4>
                            {selectedProblem.constraints.length === 0 ? (
                                <div className="demo-muted">Chưa có ràng buộc đặc thù.</div>
                            ) : (
                                <ul className="demo-exercise-list">
                                    {selectedProblem.constraints.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    {selectedProblem.meta?.sourceLabel && (
                        <div className="demo-source-note">{selectedProblem.meta.sourceLabel}</div>
                    )}
                    <div className="demo-exercise-actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onStartPractice}
                            disabled={isLocked}
                        >
                            Làm bài
                        </button>
                        {isLocked && (
                            <button type="button" className="btn btn-ghost" onClick={onResetAll}>
                                Làm lại từ đầu
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="demo-empty">Chưa có đề bài đã chọn. Hãy chọn một tab để bắt đầu.</div>
            )}
        </section>
    );
};

export default DemoProblemSetupTabs;