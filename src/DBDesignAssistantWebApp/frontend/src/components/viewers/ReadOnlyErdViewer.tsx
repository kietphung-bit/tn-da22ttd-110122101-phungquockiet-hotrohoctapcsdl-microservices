import { useMemo } from "react";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import "@xyflow/react/dist/style.css";
import "../../features/erd-workspace/erd-workspace.css";
import "./viewers.css";
import { normalizeDiagramData } from "../../features/erd-workspace";
import {
    formatEndpointCardinalityLabel,
    parseRelationshipEndpointCardinalities,
} from "../../features/erd-workspace/diagramData";
import ErdEndpointCardinalityEdge from "../../features/erd-workspace/ErdEndpointCardinalityEdge";
import ErdEntityNode from "../../features/erd-workspace/ErdEntityNode";
import type { ErdDiagramData, ErdEntity, ErdRelationship } from "../../features/erd-workspace";

type ReadOnlyErdViewerProps = {
    data: Record<string, unknown> | null | undefined;
};

const nodeTypes = { entity: ErdEntityNode };
const edgeTypes = { endpointCardinality: ErdEndpointCardinalityEdge };

const getDefaultPosition = (index: number) => ({
    x: 80 + (index % 3) * 300,
    y: 80 + Math.floor(index / 3) * 220,
});

const toNodes = (diagram: ErdDiagramData): Node<ErdEntity>[] =>
    diagram.entities.map((entity, index) => ({
        id: entity.id,
        type: "entity",
        data: entity,
        position: entity.position ?? getDefaultPosition(index),
    }));

const getRelationshipEndpointLabels = (relationship: ErdRelationship) => {
    const fallback = parseRelationshipEndpointCardinalities(relationship.cardinality);
    return {
        sourceCardinality: formatEndpointCardinalityLabel(
            relationship.sourceCardinality ?? fallback.sourceCardinality,
        ),
        targetCardinality: formatEndpointCardinalityLabel(
            relationship.targetCardinality ?? fallback.targetCardinality,
        ),
    };
};

const formatRelationshipCardinalitySummary = (relationship: ErdRelationship) => {
    const endpointLabels = getRelationshipEndpointLabels(relationship);
    return `${endpointLabels.sourceCardinality} - ${endpointLabels.targetCardinality}`;
};

const toEdges = (diagram: ErdDiagramData): Edge[] => {
    const entityIds = new Set(diagram.entities.map((entity) => entity.id));
    return diagram.relationships.flatMap((relationship) => {
        if (!entityIds.has(relationship.fromEntityId) || !entityIds.has(relationship.toEntityId)) return [];
        const endpointCardinality = getRelationshipEndpointLabels(relationship);
        return [{
            id: relationship.id,
            source: relationship.fromEntityId,
            target: relationship.toEntityId,
            type: "endpointCardinality",
            animated: false,
            style: { strokeWidth: 2 },
            data: {
                relationshipName: relationship.name,
                ...endpointCardinality,
            },
        }];
    });
};

const ReadOnlyErdViewer = ({ data }: ReadOnlyErdViewerProps) => {
    const { t } = useTranslation();
    const parsed = useMemo(() => normalizeDiagramData(data), [data]);
    const nodes = useMemo(() => toNodes(parsed.data), [parsed.data]);
    const edges = useMemo(() => toEdges(parsed.data), [parsed.data]);
    const entityById = useMemo(
        () => new Map(parsed.data.entities.map((entity) => [entity.id, entity.name])),
        [parsed.data.entities],
    );
    const isEmpty = parsed.data.entities.length === 0 && parsed.data.relationships.length === 0;
    const rawJson = JSON.stringify(data ?? {}, null, 2);

    return (
        <section className="viewer-stack">
            {!parsed.ok && (
                <div className="viewer-empty viewer-empty--warning">
                    {t("viewers.erd.invalid", {
                        defaultValue: "Dữ liệu sơ đồ chưa đúng định dạng nên chưa thể hiển thị đầy đủ. Vui lòng xem dữ liệu kỹ thuật bên dưới.",
                    })}
                </div>
            )}

            {parsed.ok && parsed.warning && (
                <div className="viewer-empty viewer-empty--warning">{parsed.warning}</div>
            )}

            {isEmpty ? (
                <div className="viewer-empty">
                    {t("viewers.erd.empty", { defaultValue: "Chưa có sơ đồ để hiển thị." })}
                </div>
            ) : (
                <>
                    <div className="erd-readonly-shell">
                        <div className="erd-readonly-canvas">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                fitView
                                fitViewOptions={{ padding: 0.24 }}
                            >
                                <Background />
                                <Controls showInteractive={false} />
                            </ReactFlow>
                        </div>
                    </div>

                    <div className="viewer-two-column">
                        <div className="viewer-panel">
                            <h3>{t("viewers.erd.entities", { defaultValue: "Entities" })}</h3>
                            <div className="viewer-card-list">
                                {parsed.data.entities.map((entity) => (
                                    <article className="viewer-mini-card" key={entity.id}>
                                        <strong>{entity.name}</strong>
                                        {entity.attributes.length > 0 ? (
                                            <ul className="viewer-list viewer-list--compact">
                                                {entity.attributes.map((attribute) => (
                                                    <li key={attribute.id}>
                                                        {attribute.isPrimaryKey && <span className="erd-pk">PK</span>}
                                                        {attribute.name}
                                                        {attribute.dataType && <span className="erd-type">{attribute.dataType}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="viewer-muted">
                                                {t("student.workspace.noAttributes", { defaultValue: "Chưa có thuộc tính." })}
                                            </p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                        <div className="viewer-panel">
                            <h3>{t("viewers.erd.relationships", { defaultValue: "Relationships" })}</h3>
                            {parsed.data.relationships.length > 0 ? (
                                <div className="viewer-card-list">
                                    {parsed.data.relationships.map((relationship) => (
                                        <article className="viewer-mini-card" key={relationship.id}>
                                            <strong>{relationship.name}</strong>
                                            <p className="viewer-muted">
                                                {entityById.get(relationship.fromEntityId) ?? relationship.fromEntityId}
                                                {" "}
                                                {formatRelationshipCardinalitySummary(relationship)}
                                                {" "}
                                                {entityById.get(relationship.toEntityId) ?? relationship.toEntityId}
                                            </p>
                                            {relationship.note && <p>{relationship.note}</p>}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="viewer-muted">
                                    {t("student.workspace.noRelationships", { defaultValue: "Chưa có relationship nào." })}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}

            <details className="viewer-technical">
                <summary>{t("viewers.technicalData", { defaultValue: "Dữ liệu kỹ thuật" })}</summary>
                <pre className="json-viewer">{rawJson}</pre>
            </details>
        </section>
    );
};

export default ReadOnlyErdViewer;
