import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ErdEntity, ErdRelationship } from "./types";
import {
    createRelationship,
    formatEndpointCardinalityLabel,
    normalizeEndpointCardinalityValue,
    parseRelationshipEndpointCardinalities,
} from "./diagramData";

type ErdRelationshipCardinalityMode = "combined" | "per-end";

type ErdRelationshipModalProps = {
    isOpen: boolean;
    entities: ErdEntity[];
    initialData?: ErdRelationship | null;
    initialConnection?: { fromEntityId: string; toEntityId: string } | null;
    isLocked: boolean;
    cardinalityMode?: ErdRelationshipCardinalityMode;
    onClose: () => void;
    onSave: (relationship: ErdRelationship) => void;
};

const cardinalityOptions = ["1 - 1", "1 - N", "N - 1", "N - N"] as const;
type CardinalityOption = (typeof cardinalityOptions)[number];

const endpointCardinalityOptions = [
    { value: "1-1", label: "1-1" },
    { value: "0-1", label: "0-1" },
    { value: "1-N", label: "1-N" },
    { value: "0-N", label: "0-N" },
] as const;
type EndpointCardinalityOption = (typeof endpointCardinalityOptions)[number]["value"];

const toCombinedCardinalityOption = (value: string | undefined): CardinalityOption =>
    cardinalityOptions.includes(value as CardinalityOption) ? value as CardinalityOption : "1 - N";

const toEndpointCardinalityOption = (
    value: string | undefined,
    fallback: EndpointCardinalityOption,
): EndpointCardinalityOption => {
    const normalized = normalizeEndpointCardinalityValue(value ?? "");
    return endpointCardinalityOptions.some((option) => option.value === normalized)
        ? normalized as EndpointCardinalityOption
        : fallback;
};

const ErdRelationshipModal = ({
    isOpen,
    entities,
    initialData,
    initialConnection,
    isLocked,
    cardinalityMode = "combined",
    onClose,
    onSave,
}: ErdRelationshipModalProps) => {
    const { t } = useTranslation();
    const initialEndpointCardinality = parseRelationshipEndpointCardinalities(initialData?.cardinality ?? "1 - N");
    const [name, setName] = useState(initialData?.name ?? "relates_to");
    const [fromEntityId, setFromEntityId] = useState(initialData?.fromEntityId ?? initialConnection?.fromEntityId ?? "");
    const [toEntityId, setToEntityId] = useState(initialData?.toEntityId ?? initialConnection?.toEntityId ?? "");
    const [cardinality, setCardinality] = useState<CardinalityOption>(
        toCombinedCardinalityOption(initialData?.cardinality),
    );
    const [sourceCardinality, setSourceCardinality] = useState<EndpointCardinalityOption>(
        toEndpointCardinalityOption(
            initialData?.sourceCardinality ?? initialEndpointCardinality.sourceCardinality,
            "1-1",
        ),
    );
    const [targetCardinality, setTargetCardinality] = useState<EndpointCardinalityOption>(
        toEndpointCardinalityOption(
            initialData?.targetCardinality ?? initialEndpointCardinality.targetCardinality,
            "0-N",
        ),
    );
    const [note, setNote] = useState(initialData?.note ?? "");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const isFormDisabled = isLocked || entities.length < 2;
    const usesPerEndCardinality = cardinalityMode === "per-end";
    const fromEntityName = entities.find((entity) => entity.id === fromEntityId)?.name;
    const toEntityName = entities.find((entity) => entity.id === toEntityId)?.name;
    // TODO: Move report-demo labels to i18n if per-end cardinality becomes production UI.
    const firstEntityLabel = usesPerEndCardinality ? "Entity 1" : t("student.workspace.relationship.fromEntity");
    const secondEntityLabel = usesPerEndCardinality ? "Entity 2" : t("student.workspace.relationship.toEntity");
    const sourceCardinalityLabel = `Bản số phía ${fromEntityName || firstEntityLabel}`;
    const targetCardinalityLabel = `Bản số phía ${toEntityName || secondEntityLabel}`;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isFormDisabled) return;

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError(t("student.workspace.relationship.validation.nameRequired"));
            return;
        }
        if (!fromEntityId || !toEntityId) {
            setError(t("student.workspace.relationship.validation.entitiesRequired"));
            return;
        }
        if (fromEntityId === toEntityId) {
            setError(t("student.workspace.relationship.validation.distinctEntities"));
            return;
        }

        const base = initialData ?? createRelationship(fromEntityId, toEntityId, trimmedName);
        const nextCardinality = usesPerEndCardinality
            ? `${sourceCardinality} - ${targetCardinality}`
            : cardinality;
        onSave({
            ...base,
            name: trimmedName,
            fromEntityId,
            toEntityId,
            cardinality: nextCardinality,
            sourceCardinality: usesPerEndCardinality ? sourceCardinality : undefined,
            targetCardinality: usesPerEndCardinality ? targetCardinality : undefined,
            note: note.trim() || undefined,
        });
    };

    return (
        <div className="erd-modal-backdrop">
            <div className="erd-modal-card">
                <div className="modal-header">
                    <h3>{initialData ? t("student.workspace.relationship.editTitle") : t("student.workspace.relationship.createTitle")}</h3>
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        {t("student.workspace.actions.close")}
                    </button>
                </div>
                <form className="erd-form" onSubmit={handleSubmit}>
                    {entities.length < 2 && (
                        <div className="erd-empty">{t("student.workspace.relationship.needsTwoEntities")}</div>
                    )}
                    <div className="form-field">
                        <label>{t("student.workspace.relationship.name")}</label>
                        <input
                            className="input"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={isFormDisabled}
                            placeholder="VD: enrolls"
                        />
                    </div>
                    <div className="erd-form__grid">
                        <div className="form-field">
                            <label>{firstEntityLabel}</label>
                            <select
                                className="input"
                                value={fromEntityId}
                                onChange={(event) => setFromEntityId(event.target.value)}
                                disabled={isFormDisabled}
                            >
                                <option value="">{t("student.workspace.relationship.selectEntity")}</option>
                                {entities.map((entity) => (
                                    <option key={entity.id} value={entity.id}>{entity.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-field">
                            <label>{secondEntityLabel}</label>
                            <select
                                className="input"
                                value={toEntityId}
                                onChange={(event) => setToEntityId(event.target.value)}
                                disabled={isFormDisabled}
                            >
                                <option value="">{t("student.workspace.relationship.selectEntity")}</option>
                                {entities.map((entity) => (
                                    <option key={entity.id} value={entity.id}>{entity.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {usesPerEndCardinality ? (
                        <div className="erd-form__grid">
                            <div className="form-field">
                                <label>{sourceCardinalityLabel}</label>
                                <select
                                    className="input"
                                    value={sourceCardinality}
                                    onChange={(event) =>
                                        setSourceCardinality(toEndpointCardinalityOption(event.target.value, "1-1"))}
                                    disabled={isFormDisabled}
                                >
                                    {endpointCardinalityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <small className="erd-field-help">
                                    Hiển thị gần entity: {formatEndpointCardinalityLabel(sourceCardinality)}
                                </small>
                            </div>
                            <div className="form-field">
                                <label>{targetCardinalityLabel}</label>
                                <select
                                    className="input"
                                    value={targetCardinality}
                                    onChange={(event) =>
                                        setTargetCardinality(toEndpointCardinalityOption(event.target.value, "0-N"))}
                                    disabled={isFormDisabled}
                                >
                                    {endpointCardinalityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <small className="erd-field-help">
                                    Hiển thị gần entity: {formatEndpointCardinalityLabel(targetCardinality)}
                                </small>
                            </div>
                        </div>
                    ) : (
                        <div className="form-field">
                            <label>{t("student.workspace.relationship.cardinality")}</label>
                            <div className="erd-cardinality-grid" role="group" aria-label={t("student.workspace.relationship.cardinality")}>
                                {cardinalityOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={`erd-cardinality-option${cardinality === option ? " erd-cardinality-option--active" : ""}`}
                                        onClick={() => setCardinality(option)}
                                        disabled={isFormDisabled}
                                    >
                                        <span>{option}</span>
                                        <small>{t(`student.workspace.relationship.cardinalityHelp.${option}`)}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="form-field">
                        <label>{t("student.workspace.relationship.note")}</label>
                        <input
                            className="input"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            disabled={isFormDisabled}
                            placeholder={t("student.workspace.relationship.notePlaceholder")}
                        />
                    </div>
                    {error && <div className="erd-form__error">{error}</div>}
                    <div className="erd-modal-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose}>
                            {t("student.workspace.actions.cancel")}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isFormDisabled}>
                            {t("student.workspace.relationship.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ErdRelationshipModal;
