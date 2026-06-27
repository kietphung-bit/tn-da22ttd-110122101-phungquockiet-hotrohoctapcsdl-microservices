import { useNavigate } from "react-router-dom";
import StudentLayout from "../../../components/layouts/StudentLayout";
import { useAuth } from "../../../hooks/useAuth";
import DemoChatBox from "../components/DemoChatBox";

const KnowledgeChatDemoPage = () => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    // const handleGoBack = () => {
    //     if (window.history.state && window.history.state.idx > 0) {
    //         navigate(-1);
    //     } else {
    //         navigate("/student/exercises");
    //     }
    // };

    return (
        <StudentLayout
            title="Chat hỏi đáp kiến thức"
            subtitle="Hỏi đáp kiến thức ERD/Normalization (phản hồi cố định)."
            onSignOut={handleSignOut}
        >
            <div className="page-header">
                <div>
                    <h2>Chat hỏi đáp kiến thức</h2>
                    <p className="demo-muted">Nguồn dữ liệu: KnowledgeBase seed demo.</p>
                </div>
                {/* <div className="action-group">
                    <button onClick={handleGoBack} className="btn btn-outline">
                        Quay lại khu vực học tập
                    </button>
                </div> */}
            </div>
            <DemoChatBox />
        </StudentLayout>
    );
};

export default KnowledgeChatDemoPage;
