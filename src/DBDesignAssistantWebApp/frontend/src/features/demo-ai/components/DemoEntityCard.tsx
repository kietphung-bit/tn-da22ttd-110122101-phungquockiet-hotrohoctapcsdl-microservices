import { Pencil, Trash2 } from "lucide-react";
import type { DemoEntity } from "../services/demoAiResponses";

type DemoEntityCardProps = {
    entity: DemoEntity;
    onEdit?: () => void;
    onDelete?: () => void;
};

const DemoEntityCard = ({ entity, onEdit, onDelete }: DemoEntityCardProps) => {
    const hasAttributes = entity.attributes.length > 0;

    return (
        <div className="demo-entity-card">
            <div className="demo-entity-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{entity.name}</span>
                <div className="action-icons">
                    {onEdit && (
                        <button type="button" className="btn-icon btn-icon--edit" onClick={onEdit} title="Sửa">
                            <Pencil size={14} />
                        </button>
                    )}
                    {onDelete && (
                        <button type="button" className="btn-icon btn-icon--danger" onClick={onDelete} title="Xoá">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
            {entity.note && <div className="demo-entity-note">{entity.note}</div>}
            {hasAttributes ? (
                <ul className="demo-attribute-list">
                    {entity.attributes.map((attribute) => (
                        <li key={attribute}>{attribute}</li>
                    ))}
                </ul>
            ) : (
                <p className="demo-muted">Chưa có thuộc tính.</p>
            )}
        </div>
    );
};

export default DemoEntityCard;