import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudentLayout from "../../../components/layouts/StudentLayout";
import { useAuth } from "../../../hooks/useAuth";
import DemoProblemSetupTabs from "../components/DemoProblemSetupTabs";
import DemoERDWorkspace from "../components/DemoERDWorkspace";
import DemoAiGuidancePanel from "../components/DemoAiGuidancePanel";
import { demoFeedbackRounds } from "../services/demoAiResponses";
import type { DemoProblem } from "../services/demoAiResponses";

const StudentDemoHomePage = () => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const navigate = useNavigate();
    const { logout } = useAuth();
    const totalRounds = demoFeedbackRounds.length;

    const [selectedProblem, setSelectedProblem] = useState<DemoProblem | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [attempt, setAttempt] = useState(1);
    const [round, setRound] = useState(0);
    const [isDesignLocked, setIsDesignLocked] = useState(false);
    const [hintApplied, setHintApplied] = useState(false);
    const [resetSeed, setResetSeed] = useState(0);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const resetWorkspace = () => {
        setResetSeed((prev) => prev + 1);
    };

    const handleSelectProblem = (problem: DemoProblem) => {
        setSelectedProblem(problem);
        setHasStarted(false);
        setAttempt(1);
        setRound(0);
        setIsDesignLocked(false);
        setHintApplied(false);
        resetWorkspace();
    };

    const handleStartExercise = () => {
        if (!selectedProblem) return;
        setHasStarted(true);
        setIsDesignLocked(false);
        setHintApplied(false);
        resetWorkspace();
    };

    const handleSubmit = () => {
        setRound((prev) => {
            if (prev >= totalRounds) return prev;
            return prev === 0 ? 1 : prev + 1;
        });
        setIsDesignLocked(true);
        setHintApplied(false);
    };

    const handleEdit = () => {
        if (round === 0 || round >= totalRounds) return;
        setIsDesignLocked(false);
        setHintApplied(true);
    };

    const handleResetAttempt = () => {
        setAttempt((prev) => prev + 1);
        setRound(0);
        setHasStarted(false);
        setIsDesignLocked(false);
        setHintApplied(false);
        resetWorkspace();
    };

    return (
        <StudentLayout
            title="Demo AI Learning"
            subtitle="Prototype UI cho luồng sinh bài - thiết kế - nộp bài - nhận gợi ý."
            onSignOut={handleSignOut}
        >
            <div className="page-header">
                <div>
                    <h2>Môi trường thực hành</h2>
                    <p className="demo-muted">
                        Toàn bộ phản hồi là cố định để demo quy trình học tập.
                    </p>
                </div>
                <div className="action-group">
                    <Link to="/student/chatbot-demo" className="btn btn-outline">
                        Mở Chat hỏi đáp kiến thức
                    </Link>
                </div>
            </div>
            <div className="demo-stack">
                <DemoProblemSetupTabs
                    isLocked={hasStarted}
                    selectedProblem={selectedProblem}
                    onSelectProblem={handleSelectProblem}
                    onStartPractice={handleStartExercise}
                    onResetAll={handleResetAttempt}
                />
                {hasStarted && (
                    <>
                        <DemoERDWorkspace key={`diagram-${resetSeed}`} isLocked={isDesignLocked} />
                        <DemoAiGuidancePanel
                            attempt={attempt}
                            round={round}
                            isDesignLocked={isDesignLocked}
                            hintApplied={hintApplied}
                            onSubmit={handleSubmit}
                            onEdit={handleEdit}
                            onResetAttempt={handleResetAttempt}
                        />
                    </>
                )}
            </div>
        </StudentLayout>
    );
};

export default StudentDemoHomePage;