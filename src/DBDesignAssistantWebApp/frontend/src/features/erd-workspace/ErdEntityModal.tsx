import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ErdAttribute, ErdEntity } from "./types";

type ErdEntityModalProps = {
    isOpen: boolean;
    initialData?: ErdEntity | null;
    isLocked: boolean;
    onClose: () => void;
    onSave: (entity: ErdEntity) => void;
};

const createId = (prefix: string) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

const parseAttributes = (value: string): ErdAttribute[] =>
    value
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const isPrimaryKey = /^\*|\(PK\)/i.test(line);
            const cleanLine = line.replace(/^\*\s*/, "").replace(/\s*\(PK\)\s*/i, "").trim();
            const [namePart, typePart] = cleanLine.split(":").map((part) => part.trim());
            return {
                id: createId(`attr-${index}`),
                name: namePart || cleanLine,
                dataType: typePart || undefined,
                isPrimaryKey,
            };
        });

type AttributeDraft = {
    id: string;
    name: string;
    dataType: string;
    isPrimaryKey: boolean;
    note: string;
};

const toAttributeDraft = (attribute?: ErdAttribute): AttributeDraft => ({
    id: attribute?.id ?? createId("attr"),
    name: attribute?.name ?? "",
    dataType: attribute?.dataType ?? "",
    isPrimaryKey: attribute?.isPrimaryKey ?? false,
    note: attribute?.note ?? "",
});

const toAttributeDrafts = (attributes: ErdAttribute[]) =>
    attributes.length > 0 ? attributes.map(toAttributeDraft) : [toAttributeDraft()];

const ErdEntityModal = ({ isOpen, initialData, isLocked, onClose, onSave }: ErdEntityModalProps) => {
    const { t } = useTranslation();
    const [name, setName] = useState(initialData?.name ?? "");
    const [attributes, setAttributes] = useState<AttributeDraft[]>(
        initialData ? toAttributeDrafts(initialData.attributes) : [toAttributeDraft()],
    );
    const [bulkAttributes, setBulkAttributes] = useState("");
    const [note, setNote] = useState(initialData?.note ?? "");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isLocked) return;

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError(t("student.workspace.entity.validation.nameRequired"));
            return;
        }

        onSave({
            id: initialData?.id ?? createId("entity"),
            name: trimmedName,
            attributes: attributes
                .map((attribute) => ({
                    id: attribute.id,
                    name: attribute.name.trim(),
                    dataType: attribute.dataType.trim() || undefined,
                    isPrimaryKey: attribute.isPrimaryKey,
                    note: attribute.note.trim() || undefined,
                }))
                .filter((attribute) => attribute.name),
            note: note.trim() || undefined,
            position: initialData?.position,
        });
    };

    const updateAttribute = (id: string, next: Partial<AttributeDraft>) => {
        setAttributes((current) =>
            current.map((attribute) => (attribute.id === id ? { ...attribute, ...next } : attribute)),
        );
    };

    const removeAttribute = (id: string) => {
        setAttributes((current) => {
            const next = current.filter((attribute) => attribute.id !== id);
            return next.length > 0 ? next : [toAttributeDraft()];
        });
    };

    const appendBulkAttributes = () => {
        const parsed = parseAttributes(bulkAttributes);
        if (parsed.length === 0) {
            setError(t("student.workspace.entity.validation.bulkEmpty"));
            return;
        }
        setError(null);
        setAttributes((current) => [
            ...current.filter((attribute) => attribute.name.trim()),
            ...parsed.map((attribute) => toAttributeDraft(attribute)),
        ]);
        setBulkAttributes("");
    };

    return (
        <div className="erd-modal-backdrop">
            <div className="erd-modal-card">
                <div className="modal-header">
                    <h3>{initialData ? t("student.workspace.entity.editTitle") : t("student.workspace.entity.createTitle")}</h3>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        {t("student.workspace.actions.close")}
                    </button>
                </div>
                <form className="erd-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label>{t("student.workspace.entity.name")}</label>
                        <input
                            className="input"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={isLocked}
                            placeholder="VD: Student"
                        />
                    </div>
                    <div className="form-field">
                        <label>{t("student.workspace.entity.attributes")}</label>
                        <div className="erd-attribute-editor">
                            {attributes.map((attribute) => (
                                <div className="erd-attribute-row" key={attribute.id}>
                                    <label className="erd-attribute-row__pk">
                                        <input
                                            type="checkbox"
                                            checked={attribute.isPrimaryKey}
                                            onChange={(event) => updateAttribute(attribute.id, { isPrimaryKey: event.target.checked })}
                                            disabled={isLocked}
                                        />
                                        PK
                                    </label>
                                    <input
                                        className="input"
                                        value={attribute.name}
                                        onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                                        disabled={isLocked}
                                        placeholder={t("student.workspace.entity.attributeNamePlaceholder")}
                                    />
                                    <input
                                        className="input"
                                        value={attribute.dataType}
                                        onChange={(event) => updateAttribute(attribute.id, { dataType: event.target.value })}
                                        disabled={isLocked}
                                        placeholder={t("student.workspace.entity.attributeTypePlaceholder")}
                                    />
                                    <input
                                        className="input"
                                        value={attribute.note}
                                        onChange={(event) => updateAttribute(attribute.id, { note: event.target.value })}
                                        disabled={isLocked}
                                        placeholder={t("student.workspace.entity.attributeNotePlaceholder")}
                                    />
                                    <button
                                        type="button"
                                        className="btn-icon btn-icon--danger"
                                        onClick={() => removeAttribute(attribute.id)}
                                        disabled={isLocked}
                                        title={t("student.workspace.actions.delete")}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-outline erd-inline-action"
                                onClick={() => setAttributes((current) => [...current, toAttributeDraft()])}
                                disabled={isLocked}
                            >
                                <Plus size={14} />
                                {t("student.workspace.entity.addAttribute")}
                            </button>
                        </div>
                    </div>
                    <div className="form-field">
                        <label>{t("student.workspace.entity.bulkAttributes")}</label>
                        <textarea
                            className="textarea"
                            rows={3}
                            value={bulkAttributes}
                            onChange={(event) => setBulkAttributes(event.target.value)}
                            disabled={isLocked}
                            placeholder={t("student.workspace.entity.bulkPlaceholder")}
                        />
                        <button
                            type="button"
                            className="btn btn-outline erd-inline-action"
                            onClick={appendBulkAttributes}
                            disabled={isLocked || !bulkAttributes.trim()}
                        >
                            {t("student.workspace.entity.applyBulk")}
                        </button>
                    </div>
                    <div className="form-field">
                        <label>{t("student.workspace.entity.note")}</label>
                        <input
                            className="input"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            disabled={isLocked}
                            placeholder="VD: Lưu thông tin sinh viên"
                        />
                    </div>
                    {error && <div className="erd-form__error">{error}</div>}
                    <div className="erd-modal-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose}>
                            {t("student.workspace.actions.cancel")}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLocked}>
                            {t("student.workspace.entity.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ErdEntityModal;
