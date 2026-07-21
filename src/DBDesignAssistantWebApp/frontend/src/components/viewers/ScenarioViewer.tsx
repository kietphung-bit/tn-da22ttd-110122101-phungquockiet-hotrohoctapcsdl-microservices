import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "./viewers.css";

type ScenarioViewerProps = {
    data: Record<string, unknown> | null | undefined;
    showSummary?: boolean;
    showTechnicalData?: boolean;
    showExtraFields?: boolean;
    showEmptySections?: boolean;
};

type FieldItem = {
    key: string;
    label: string;
    value: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toTextList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => {
            if (typeof item === "string" || typeof item === "number") {
                const text = String(item).trim();
                return text ? [text] : [];
            }
            if (isRecord(item)) {
                const text = readString(item.text)
                    || readString(item.description)
                    || readString(item.name)
                    || readString(item.requirement)
                    || readString(item.constraint);
                return text ? [text] : [];
            }
            return [];
        });
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const formatLabel = (key: string) =>
    key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (char) => char.toUpperCase());

const findFirst = (data: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        if (data[key] !== undefined && data[key] !== null) return data[key];
    }
    return undefined;
};

const isRenderablePrimitive = (value: unknown) =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const ScenarioViewer = ({
    data,
    showSummary = true,
    showTechnicalData = true,
    showExtraFields = true,
    showEmptySections = true,
}: ScenarioViewerProps) => {
    const { t } = useTranslation();

    const normalized = useMemo(() => {
        const source = isRecord(data) ? data : {};
        const context = findFirst(source, [
            "businessContext",
            "context",
            "problemContext",
            "domainContext",
            "scenario",
            "background",
        ]);
        const requirements = toTextList(findFirst(source, [
            "requirements",
            "businessRequirements",
            "functionalRequirements",
            "tasks",
        ]));
        const constraints = toTextList(findFirst(source, [
            "constraints",
            "dataConstraints",
            "businessRules",
            "rules",
            "integrityConstraints",
        ]));
        const designHints = toTextList(findFirst(source, [
            "designScopeHints",
            "scopeHints",
            "designHints",
        ]));
        const tags = toTextList(findFirst(source, ["tags", "keywords"]));
        const difficulty = readString(findFirst(source, ["difficulty", "level"]));
        const entities = Array.isArray(source.entities) ? source.entities : [];

        const usedKeys = new Set([
            "businessContext",
            "context",
            "problemContext",
            "domainContext",
            "scenario",
            "background",
            "requirements",
            "businessRequirements",
            "functionalRequirements",
            "tasks",
            "constraints",
            "dataConstraints",
            "businessRules",
            "rules",
            "integrityConstraints",
            "designScopeHints",
            "scopeHints",
            "designHints",
            "tags",
            "keywords",
            "difficulty",
            "level",
            "entities",
            "reviewStatus",
            "reviewSource",
            "reviewCreatedAt",
            "reviewedAt",
            "reviewedByRole",
            "rejectReason",
            "baseExerciseId",
            "baseExerciseCode",
        ]);

        const extraFields: FieldItem[] = Object.entries(source)
            .filter(([key, value]) => !usedKeys.has(key) && isRenderablePrimitive(value) && String(value).trim())
            .slice(0, 8)
            .map(([key, value]) => ({ key, label: formatLabel(key), value }));

        return {
            source,
            context: readString(context),
            requirements,
            constraints,
            designHints,
            tags,
            difficulty,
            entities,
            extraFields,
            isEmpty: Object.keys(source).length === 0,
            isInvalid: data !== null && data !== undefined && !isRecord(data),
        };
    }, [data]);

    const rawJson = JSON.stringify(data ?? {}, null, 2);

    if (normalized.isInvalid) {
        return (
            <section className="viewer-stack">
                <div className="viewer-empty">
                    {t("viewers.scenario.invalid", {
                        defaultValue: "Dữ liệu kịch bản không đúng định dạng. Hệ thống vẫn giữ dữ liệu kỹ thuật bên dưới để kiểm tra.",
                    })}
                </div>
                {showTechnicalData && (
                    <details className="viewer-technical">
                        <summary>{t("viewers.technicalData", { defaultValue: "Dữ liệu kỹ thuật" })}</summary>
                        <pre className="json-viewer">{rawJson}</pre>
                    </details>
                )}
            </section>
        );
    }

    const hasVisibleLearningContent = Boolean(
        normalized.context
        || normalized.requirements.length > 0
        || normalized.constraints.length > 0
        || normalized.designHints.length > 0
        || normalized.tags.length > 0
        || (showExtraFields && normalized.extraFields.length > 0)
    );

    if (!normalized.isEmpty && !showSummary && !showTechnicalData && !hasVisibleLearningContent) {
        return null;
    }

    return (
        <section className="viewer-stack">
            {normalized.isEmpty ? (
                <div className="viewer-empty">
                    {t("viewers.scenario.empty", { defaultValue: "Chưa có dữ liệu kịch bản." })}
                </div>
            ) : (
                <>
                    {showSummary && (
                        <div className="scenario-summary-grid">
                            <div className="scenario-summary-card">
                                <span>{t("viewers.scenario.difficulty", { defaultValue: "Độ khó" })}</span>
                                <strong>{normalized.difficulty || t("common.empty", { defaultValue: "Không có dữ liệu" })}</strong>
                            </div>
                            <div className="scenario-summary-card">
                                <span>{t("viewers.scenario.requirementCount", { defaultValue: "Yêu cầu" })}</span>
                                <strong>{normalized.requirements.length}</strong>
                            </div>
                            <div className="scenario-summary-card">
                                <span>{t("viewers.scenario.constraintCount", { defaultValue: "Ràng buộc" })}</span>
                                <strong>{normalized.constraints.length}</strong>
                            </div>
                            <div className="scenario-summary-card">
                                <span>{t("viewers.scenario.entityCount", { defaultValue: "Entity gợi ý" })}</span>
                                <strong>{normalized.entities.length}</strong>
                            </div>
                        </div>
                    )}

                    {normalized.context && (
                        <div className="viewer-panel">
                            <h3>{t("viewers.scenario.context", { defaultValue: "Bối cảnh nghiệp vụ" })}</h3>
                            <p>{normalized.context}</p>
                        </div>
                    )}

                    {(showEmptySections || normalized.requirements.length > 0 || normalized.constraints.length > 0) && (
                        <div className="viewer-two-column">
                            {(showEmptySections || normalized.requirements.length > 0) && (
                                <div className="viewer-panel">
                                    <h3>{t("viewers.scenario.requirements", { defaultValue: "Yêu cầu thiết kế" })}</h3>
                                    {normalized.requirements.length > 0 ? (
                                        <ul className="viewer-list">
                                            {normalized.requirements.map((item, index) => (
                                                <li key={`${item}-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="viewer-muted">
                                            {t("viewers.scenario.noRequirements", { defaultValue: "Chưa có yêu cầu cụ thể." })}
                                        </p>
                                    )}
                                </div>
                            )}
                            {(showEmptySections || normalized.constraints.length > 0) && (
                                <div className="viewer-panel">
                                    <h3>{t("viewers.scenario.constraints", { defaultValue: "Ràng buộc nghiệp vụ" })}</h3>
                                    {normalized.constraints.length > 0 ? (
                                        <ul className="viewer-list">
                                            {normalized.constraints.map((item, index) => (
                                                <li key={`${item}-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="viewer-muted">
                                            {t("viewers.scenario.noConstraints", { defaultValue: "Chưa có ràng buộc cụ thể." })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {normalized.designHints.length > 0 && (
                        <div className="viewer-panel">
                            <h3>{t("viewers.scenario.designHints", { defaultValue: "Gợi ý phạm vi thiết kế" })}</h3>
                            <ul className="viewer-list">
                                {normalized.designHints.map((item, index) => (
                                    <li key={`${item}-${index}`}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {(normalized.tags.length > 0 || (showExtraFields && normalized.extraFields.length > 0)) && (
                        <div className="viewer-panel">
                            {normalized.tags.length > 0 && (
                                <div className="viewer-tags">
                                    {normalized.tags.map((tag) => (
                                        <span className="tag" key={tag}>{tag}</span>
                                    ))}
                                </div>
                            )}
                            {showExtraFields && normalized.extraFields.length > 0 && (
                                <dl className="viewer-kv-grid">
                                    {normalized.extraFields.map((field) => (
                                        <div key={field.key}>
                                            <dt>{field.label}</dt>
                                            <dd>{String(field.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </div>
                    )}
                </>
            )}

            {showTechnicalData && (
                <details className="viewer-technical">
                    <summary>{t("viewers.technicalData", { defaultValue: "Dữ liệu kỹ thuật" })}</summary>
                    <pre className="json-viewer">{rawJson}</pre>
                </details>
            )}
        </section>
    );
};

export default ScenarioViewer;
