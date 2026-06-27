import { Pencil, Trash2 } from "lucide-react";
import type { DemoEntity, DemoRelationship } from "../services/demoAiResponses";

type DemoRelationshipPanelProps = {
    entities: DemoEntity[];
    relationships: DemoRelationship[];
    isLocked: boolean;
    onOpenCreate: () => void;
    onEdit?: (relationship: DemoRelationship) => void;
    onDelete?: (id: string) => void;
};

const DemoRelationshipPanel = ({
    entities,
    relationships,
    isLocked,
    onOpenCreate,
    onEdit,
    onDelete,
}: DemoRelationshipPanelProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const hasEnoughEntities = entities.length >= 2;
    const canCreate = !isLocked && hasEnoughEntities;

    return (
        <div className="demo-workspace-panel">
            <div className="demo-panel-header">
                <h4 className="demo-block-title">Quan hệ</h4>
                <button type="button" className="btn btn-outline" onClick={onOpenCreate} disabled={!canCreate}>
                    Thêm quan hệ
                </button>
            </div>
            {!hasEnoughEntities && (
                <div className="demo-empty">
                    Cần ít nhất 2 thực thể để tạo quan hệ.
                </div>
            )}
            <div className="demo-form__note">
                {isLocked
                    ? "Khu vực đang bị khóa."
                    : hasEnoughEntities
                    ? "Nhấn Thêm quan hệ để tạo liên kết giữa thực thể."
                    : "Hãy tạo thực thể trước."}
            </div>

            {relationships.length === 0 ? (
                <div className="demo-empty">Chưa có quan hệ nào.</div>
            ) : (
                <div className="demo-relationship-list">
                    {relationships.map((relationship) => (
                        <div key={relationship.id} className="demo-relationship-card">
                            <div className="demo-relationship-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{relationship.name}</span>
                                <div className="action-icons">
                                    {onEdit && (
                                        <button type="button" className="btn-icon btn-icon--edit" onClick={() => onEdit(relationship)} title="Sửa" disabled={isLocked}>
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button type="button" className="btn-icon btn-icon--danger" onClick={() => onDelete(relationship.id)} title="Xoá" disabled={isLocked}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="demo-relationship-meta">
                                {relationship.from} {relationship.cardinality} {relationship.to}
                            </div>
                            {relationship.note && (
                                <div className="demo-relationship-note">{relationship.note}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DemoRelationshipPanel;