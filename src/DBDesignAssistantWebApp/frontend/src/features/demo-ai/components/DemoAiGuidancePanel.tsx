import { demoFeedbackRounds } from "../services/demoAiResponses";

type DemoAiGuidancePanelProps = {
    attempt: number;
    round: number;
    isDesignLocked: boolean;
    hintApplied: boolean;
    onSubmit: () => void;
    onEdit: () => void;
    onResetAttempt: () => void;
};

const DemoAiGuidancePanel = ({
    attempt,
    round,
    isDesignLocked,
    hintApplied,
    onSubmit,
    onEdit,
    onResetAttempt,
}: DemoAiGuidancePanelProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const totalRounds = demoFeedbackRounds.length;
    const hasSubmitted = round > 0;
    const isLimitReached = round >= totalRounds;
    const currentFeedback = hasSubmitted ? demoFeedbackRounds[round - 1] : [];
    const submitLabel = round === 0 ? "Nộp bài" : "Nộp lại";
    const canSubmit = !isLimitReached && (round === 0 || !isDesignLocked);
    const canEdit = hasSubmitted && !isLimitReached && isDesignLocked;

    return (
        <section className="section-card demo-section">
            <div className="demo-section__header">
                <div>
                    <h3 className="demo-section__title">Nộp bài và nhận xét</h3>
                    <p className="demo-section__subtitle">
                        Mỗi lần tối đa {totalRounds} vòng nhận xét, AI chỉ gợi ý từng bước.
                    </p>
                </div>
                <span className="demo-badge demo-badge--info">Demo nhận xét AI</span>
            </div>
            <div className="demo-status">
                <div className="demo-status__item">Lần thực hiện: {attempt}</div>
                <div className="demo-status__item">
                    Vòng nhận xét: {hasSubmitted ? `${round}/${totalRounds}` : `0/${totalRounds}`}
                </div>
                <div className="demo-status__item">
                    Trạng thái thiết kế: {isDesignLocked ? "Đang khóa" : "Đang mở"}
                </div>
                <div className="demo-status__item">Quy tắc: tối đa {totalRounds} vòng/lần thực hiện</div>
            </div>
            <div className="demo-action-row">
                <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={!canSubmit}>
                    {submitLabel}
                </button>
                <button type="button" className="btn btn-outline" onClick={onEdit} disabled={!canEdit}>
                    Sửa bài
                </button>
                <button type="button" className="btn btn-ghost" onClick={onResetAttempt}>
                    Làm lại từ đầu
                </button>
            </div>
            {!hasSubmitted ? (
                <div className="demo-empty">Nộp bài để hệ thống nhận xét.</div>
            ) : (
                <div className="demo-feedback">
                    <div className="demo-feedback__title">Phản hồi vòng {round}</div>
                    <ul className="demo-feedback__list">
                        {currentFeedback.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                    <div className="demo-note">
                        AI chỉ gợi ý từng bước, không cung cấp đáp án hoàn chỉnh.
                    </div>
                </div>
            )}
            {hasSubmitted && !isLimitReached && isDesignLocked && (
                <div className="demo-note">Nhấn "Sửa bài" để mở lại khu vực thiết kế.</div>
            )}
            {hasSubmitted && !isLimitReached && !isDesignLocked && (
                <div className="demo-note">Đang chỉnh sửa. Nhấn "Nộp lại" để nhận phản hồi tiếp.</div>
            )}
            {isLimitReached && (
                <div className="demo-note">Bạn đã đạt tối đa số vòng nhận xét cho lần thực hiện này.</div>
            )}
            {hintApplied && hasSubmitted && (
                <div className="demo-note demo-note--success">
                    Đã ghi nhận bạn đang sửa theo gợi ý. Hãy nộp lại để nhận phản hồi tiếp.
                </div>
            )}
        </section>
    );
};

export default DemoAiGuidancePanel;
