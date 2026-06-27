import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { DemoEntity, DemoRelationship } from "../services/demoAiResponses";

type DemoRelationshipModalProps = {
    isOpen: boolean;
    isLocked: boolean;
    entities: DemoEntity[];
    initialData?: DemoRelationship | null;
    onClose: () => void;
    onSave: (relationship: DemoRelationship) => void;
};

const cardinalityOptions = ["1 - 1", "1 - N", "N - 1", "N - N"] as const;

const createLocalId = () => `rel-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;

const DemoRelationshipModal = ({
    isOpen,
    isLocked,
    entities,
    initialData,
    onClose,
    onSave,
}: DemoRelationshipModalProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const [relationshipName, setRelationshipName] = useState("");
    const [fromEntityId, setFromEntityId] = useState("");
    const [toEntityId, setToEntityId] = useState("");
    const [cardinality, setCardinality] = useState<(typeof cardinalityOptions)[number]>(cardinalityOptions[1]);
    const [relationshipNote, setRelationshipNote] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const fromEnt = entities.find(e => e.name === initialData.from);
                const toEnt = entities.find(e => e.name === initialData.to);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRelationshipName(initialData.name);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setFromEntityId(fromEnt?.id || "");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setToEntityId(toEnt?.id || "");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCardinality(initialData.cardinality as (typeof cardinalityOptions)[number]);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRelationshipNote(initialData.note || "");
            } else {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRelationshipName("");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setFromEntityId("");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setToEntityId("");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCardinality(cardinalityOptions[1]);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRelationshipNote("");
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormError(null);
        }
    }, [isOpen, initialData, entities]);

    if (!isOpen) return null;

    const hasEnoughEntities = entities.length >= 2;
    const isFormDisabled = isLocked || !hasEnoughEntities;

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isFormDisabled) return;

        const trimmedName = relationshipName.trim();
        if (!trimmedName) {
            setFormError("Vui lòng nhập tên quan hệ.");
            return;
        }

        if (!fromEntityId || !toEntityId) {
            setFormError("Vui lòng chọn đủ hai thực thể.");
            return;
        }

        if (fromEntityId === toEntityId) {
            setFormError("Hai thực thể không được trùng nhau.");
            return;
        }

        const fromEntity = entities.find((entity) => entity.id === fromEntityId);
        const toEntity = entities.find((entity) => entity.id === toEntityId);

        if (!fromEntity || !toEntity) {
            setFormError("Thực thể không tồn tại trong danh sách.");
            return;
        }

        onSave({
            id: initialData?.id || createLocalId(),
            name: trimmedName,
            from: fromEntity.name,
            to: toEntity.name,
            cardinality,
            note: relationshipNote.trim() || undefined,
        });

        onClose();
    };

    return (
        <div className="demo-modal-backdrop">
            <div className="demo-modal-card">
                <div className="modal-header">
                    <h3>Thêm quan hệ</h3>
                    <button type="button" className="btn btn-ghost" onClick={handleClose}>
                        Đóng
                    </button>
                </div>
                <form className="demo-form" onSubmit={handleSubmit}>
                    {!hasEnoughEntities && (
                        <div className="demo-empty">
                            Cần ít nhất 2 thực thể để tạo quan hệ.
                        </div>
                    )}
                    <div className="form-field">
                        <label>Tên quan hệ</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="VD: Member borrows Book"
                            value={relationshipName}
                            onChange={(event) => setRelationshipName(event.target.value)}
                            disabled={isFormDisabled}
                        />
                    </div>
                    <div className="demo-form__grid">
                        <div className="form-field">
                            <label>Từ thực thể</label>
                            <select
                                className="input"
                                value={fromEntityId}
                                onChange={(event) => setFromEntityId(event.target.value)}
                                disabled={isFormDisabled}
                            >
                                <option value="">Chọn thực thể</option>
                                {entities.map((entity) => (
                                    <option key={entity.id} value={entity.id}>
                                        {entity.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Đến thực thể</label>
                            <select
                                className="input"
                                value={toEntityId}
                                onChange={(event) => setToEntityId(event.target.value)}
                                disabled={isFormDisabled}
                            >
                                <option value="">Chọn thực thể</option>
                                {entities.map((entity) => (
                                    <option key={entity.id} value={entity.id}>
                                        {entity.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="demo-form__grid">
                        <div className="form-field">
                            <label>Cardinality</label>
                            <select
                                className="input"
                                value={cardinality}
                                onChange={(event) =>
                                    setCardinality(event.target.value as (typeof cardinalityOptions)[number])
                                }
                                disabled={isFormDisabled}
                            >
                                {cardinalityOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Ghi chú</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="VD: Cần bảng trung gian nếu N-N"
                                value={relationshipNote}
                                onChange={(event) => setRelationshipNote(event.target.value)}
                                disabled={isFormDisabled}
                            />
                        </div>
                    </div>
                    {formError && <div className="demo-form__error">{formError}</div>}
                    <div className="demo-modal-actions">
                        <button type="button" className="btn btn-outline" onClick={handleClose}>
                            Huỷ
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isFormDisabled}>
                            Lưu quan hệ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DemoRelationshipModal;
