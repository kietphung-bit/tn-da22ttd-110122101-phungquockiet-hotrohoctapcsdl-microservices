import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import ExerciseManagementPage from "./pages/ExerciseManagementPage";
import ExerciseDetailPage from "./pages/ExerciseDetailPage";
import UserManagementPage from "./pages/UserManagementPage";
import SubmissionManagementPage from "./pages/SubmissionManagementPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import EvaluationRoundMonitoringPage from "./pages/EvaluationRoundMonitoringPage";
import AdminExerciseAiGenerationPage from "./pages/admin/AdminExerciseAiGenerationPage";
import AdminPracticeInsightsPage from "./pages/admin/AdminPracticeInsightsPage";
import KnowledgeBaseManagementPage from "./pages/KnowledgeBaseManagementPage";
import SkillManagementPage from "./pages/SkillManagementPage";
import StudentSkillStatsPage from "./pages/StudentSkillStatsPage";
import InstructorExerciseManagementPage from "./pages/instructor/InstructorExerciseManagementPage";
import InstructorExerciseAiGenerationPage from "./pages/instructor/InstructorExerciseAiGenerationPage";
import InstructorExerciseDetailPage from "./pages/instructor/InstructorExerciseDetailPage";
import InstructorKnowledgeBasePage from "./pages/instructor/InstructorKnowledgeBasePage";
import InstructorPracticeInsightsPage from "./pages/instructor/InstructorPracticeInsightsPage";
import StudentExerciseListPage from "./pages/student/StudentExerciseListPage";
import StudentExerciseDetailPage from "./pages/student/StudentExerciseDetailPage";
import StudentSubmissionHistoryPage from "./pages/student/StudentSubmissionHistoryPage";
import StudentSubmissionDetailPage from "./pages/student/StudentSubmissionDetailPage";
import StudentChatbotPage from "./pages/student/StudentChatbotPage";
import StudentExerciseGeneratorPage from "./pages/student/StudentExerciseGeneratorPage";
import StudentReportErdDemoPage from "./pages/student/StudentReportErdDemoPage";
import KnowledgeChatDemoPage from "./features/demo-ai/pages/KnowledgeChatDemoPage";
import { useAuthInit } from "./hooks/useAuthInit";
import ProtectedRoute from "./routes/ProtectedRoute";

const StudentDemoHomePage = lazy(() => import("./features/demo-ai/pages/StudentDemoHomePage"));
const StudentWorkspacePage = lazy(() => import("./pages/student/StudentWorkspacePage"));

function App() {
    useAuthInit();

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute>
                        <UserManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/exercises"
                element={
                    <ProtectedRoute>
                        <ExerciseManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/exercises/ai-generate"
                element={
                    <ProtectedRoute>
                        <AdminExerciseAiGenerationPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/exercises/:id"
                element={
                    <ProtectedRoute>
                        <ExerciseDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/instructor/exercises"
                element={
                    <ProtectedRoute allowedRoles={["INSTRUCTOR"]}>
                        <InstructorExerciseManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/instructor/exercises/ai-generate"
                element={
                    <ProtectedRoute allowedRoles={["INSTRUCTOR"]}>
                        <InstructorExerciseAiGenerationPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/instructor/exercises/:id"
                element={
                    <ProtectedRoute allowedRoles={["INSTRUCTOR"]}>
                        <InstructorExerciseDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/instructor/practice-insights"
                element={
                    <ProtectedRoute allowedRoles={["INSTRUCTOR"]}>
                        <InstructorPracticeInsightsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/instructor/knowledge-base"
                element={
                    <ProtectedRoute allowedRoles={["INSTRUCTOR"]}>
                        <InstructorKnowledgeBasePage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/submissions"
                element={
                    <ProtectedRoute>
                        <SubmissionManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/submissions/:id"
                element={
                    <ProtectedRoute>
                        <SubmissionDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/practice-insights"
                element={
                    <ProtectedRoute>
                        <AdminPracticeInsightsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/evaluation-rounds"
                element={
                    <ProtectedRoute>
                        <EvaluationRoundMonitoringPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/knowledge-base"
                element={
                    <ProtectedRoute>
                        <KnowledgeBaseManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/skills"
                element={
                    <ProtectedRoute>
                        <SkillManagementPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/student-skill-stats"
                element={
                    <ProtectedRoute>
                        <StudentSkillStatsPage />
                    </ProtectedRoute>
                }
            />
            {/* Student Routes */}
            <Route
                path="/student/demo"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <Suspense fallback={<div className="loading-text">Đang tải demo...</div>}>
                            <StudentDemoHomePage />
                        </Suspense>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/chatbot"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentChatbotPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/chatbot-demo"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <KnowledgeChatDemoPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/exercise-generator"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentExerciseGeneratorPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/report-erd-demo"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentReportErdDemoPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/exercises"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentExerciseListPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/exercises/:id"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentExerciseDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/workspace/:submissionId"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <Suspense fallback={<div className="loading-text">Đang tải workspace...</div>}>
                            <StudentWorkspacePage />
                        </Suspense>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/submissions"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentSubmissionHistoryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/submissions/:id"
                element={
                    <ProtectedRoute allowedRoles={["STUDENT"]}>
                        <StudentSubmissionDetailPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;
