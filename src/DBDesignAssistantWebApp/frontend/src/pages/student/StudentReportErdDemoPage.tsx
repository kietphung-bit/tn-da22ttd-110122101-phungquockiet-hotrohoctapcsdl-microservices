import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "../../components/layouts/StudentLayout";
import { ErdWorkspaceEditor, createEmptyDiagramData } from "../../features/erd-workspace";
import type { ErdDiagramData } from "../../features/erd-workspace";
import { useAuth } from "../../hooks/useAuth";

const StudentReportErdDemoPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [initialDiagramData] = useState<ErdDiagramData>(() => createEmptyDiagramData());
    const [, setDiagramData] = useState<ErdDiagramData>(initialDiagramData);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    return (
        <StudentLayout
            title="Môi trường thực hành"
            subtitle="Vẽ sơ đồ ERD"
            onSignOut={handleSignOut}
        >
            <div className="page-header">
                <div>
                    <h2>Interactive ERD workspace demo</h2>
                    <div className="tags-list">
                        <span className="tag tag--draft">DRAFT</span>
                        <span className="tag">Report screenshot</span>
                        <span className="tag">Frontend only</span>
                    </div>
                </div>
            </div>

            <section className="section-card">
                <div className="info-notice" style={{ marginBottom: 16 }}>
                    This demo starts from an empty diagram and reuses the same ERD editor as the student workspace.
                    It does not create a submission, save a draft, submit work, or call evaluation APIs.
                </div>
                <ErdWorkspaceEditor
                    initialData={initialDiagramData}
                    isLocked={false}
                    onChange={setDiagramData}
                    edgeLabelMode="endpoint-cardinality"
                    relationshipCardinalityMode="per-end"
                />
            </section>
        </StudentLayout>
    );
};

export default StudentReportErdDemoPage;
