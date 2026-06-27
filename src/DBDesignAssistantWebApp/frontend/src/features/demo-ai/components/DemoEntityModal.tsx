import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { DemoEntity } from "../services/demoAiResponses";

type DemoEntityModalProps = {
    isOpen: boolean;
    isLocked: boolean;
    initialData?: DemoEntity | null;
    onClose: () => void;
    onSave: (entity: DemoEntity) => void;
};

const createLocalId = () => `entity-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;

const parseAttributeInput = (value: string) =>
    value
        .split(/\r?\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean);

const DemoEntityModal = ({ isOpen, isLocked, initialData, onClose, onSave }: DemoEntityModalProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const [entityName, setEntityName] = useState("");
    const [entityAttributes, setEntityAttributes] = useState("");
    const [entityNote, setEntityNote] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityName(initialData.name);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityAttributes(initialData.attributes.join("\n"));
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityNote(initialData.note || "");
            } else {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityName("");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityAttributes("");
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setEntityNote("");
            }
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormError(null);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleClose = () => {
        onClose();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLocked) return;

        const trimmedName = entityName.trim();
        if (!trimmedName) {
            setFormError("Vui lòng nhập tên thực thể.");
            return;
        }

        const attributes = parseAttributeInput(entityAttributes);

        onSave({
            id: initialData?.id || createLocalId(),
            name: trimmedName,
            attributes,
            note: entityNote.trim() || undefined,
        });

        onClose();
    };

    return (
        <div className="demo-modal-backdrop">
            <div className="demo-modal-card">
                <div className="modal-header">
                    <h3>Thêm thực thể</h3>
                    <button type="button" className="btn btn-ghost" onClick={handleClose}>
                        Đóng
                    </button>
                </div>
                <form className="demo-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>Tên thực thể</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="VD: Member"
                            value={entityName}
                            onChange={(event) => setEntityName(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    <div className="form-field">
                        <label>Thuộc tính</label>
                        <textarea
                            className="textarea"
                            rows={4}
                            placeholder="Mỗi dòng là 1 thuộc tính (hoặc phân tách bằng dấu phẩy)"
                            value={entityAttributes}
                            onChange={(event) => setEntityAttributes(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    <div className="form-field">
                        <label>Ghi chú</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="VD: Thuộc tính đạo cho thực thể Member"
                            value={entityNote}
                            onChange={(event) => setEntityNote(event.target.value)}
                            disabled={isLocked}
                        />
                    </div>
                    {formError && <div className="demo-form__error">{formError}</div>}
                    <div className="demo-modal-actions">
                        <button type="button" className="btn btn-outline" onClick={handleClose}>
                            Huỷ
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLocked}>
                            Lưu thực thể
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DemoEntityModal;
