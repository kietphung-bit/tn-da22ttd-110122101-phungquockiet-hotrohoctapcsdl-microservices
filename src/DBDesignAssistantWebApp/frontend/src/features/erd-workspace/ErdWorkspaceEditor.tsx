import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Controls, MarkerType, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import type { Connection, Edge, EdgeChange, Node, NodeChange, ReactFlowInstance } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@xyflow/react/dist/style.css";
import "./erd-workspace.css";
import {
    createEmptyDiagramData,
    createEntity,
    formatEndpointCardinalityLabel,
    parseDiagramJson,
    parseRelationshipEndpointCardinalities,
    touchDiagramData,
} from "./diagramData";
import ErdEndpointCardinalityEdge from "./ErdEndpointCardinalityEdge";
import ErdEntityModal from "./ErdEntityModal";
import ErdEntityNode from "./ErdEntityNode";
import ErdRelationshipModal from "./ErdRelationshipModal";
import type { ErdDiagramData, ErdEntity, ErdRelationship } from "./types";

type ErdEdgeLabelMode = "default" | "endpoint-cardinality";
type ErdRelationshipCardinalityMode = "combined" | "per-end";

type ErdWorkspaceEditorProps = {
    initialData: ErdDiagramData;
    isLocked?: boolean;
    onChange?: (data: ErdDiagramData) => void;
    edgeLabelMode?: ErdEdgeLabelMode;
    relationshipCardinalityMode?: ErdRelationshipCardinalityMode;
};

type WorkspaceTab = "canvas" | "manage" | "json";

const nodeTypes = { entity: ErdEntityNode };
const edgeTypes = { endpointCardinality: ErdEndpointCardinalityEdge };

const getDefaultPosition = (index: number) => ({
    x: 80 + (index % 3) * 320,
    y: 80 + Math.floor(index / 3) * 240,
});

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
    if (!relationship.sourceCardinality && !relationship.targetCardinality) {
        return relationship.cardinality;
    }

    const endpointLabels = getRelationshipEndpointLabels(relationship);
    return `${endpointLabels.sourceCardinality} - ${endpointLabels.targetCardinality}`;
};

const ErdWorkspaceEditor = ({
    initialData,
    isLocked = false,
    onChange,
    edgeLabelMode = "default",
    relationshipCardinalityMode = "combined",
}: ErdWorkspaceEditorProps) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("canvas");
    const [diagramData, setDiagramData] = useState<ErdDiagramData>(initialData);
    const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(initialData, null, 2));
    const [notice, setNotice] = useState<string | null>(null);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [entityToEdit, setEntityToEdit] = useState<ErdEntity | null>(null);
    const [relationshipToEdit, setRelationshipToEdit] = useState<ErdRelationship | null>(null);
    const [connectionDraft, setConnectionDraft] = useState<{ fromEntityId: string; toEntityId: string } | null>(null);
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const rfInstance = useRef<ReactFlowInstance | null>(null);

    const entities = diagramData.entities;
    const relationships = diagramData.relationships;
    const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
    const isEmpty = entities.length === 0 && relationships.length === 0;

    const commitDiagram = useCallback((nextData: ErdDiagramData, message?: string) => {
        const touched = touchDiagramData(nextData);
        setDiagramData(touched);
        onChange?.(touched);
        if (activeTab === "json") {
            setJsonDraft(JSON.stringify(touched, null, 2));
        }
        if (message) setNotice(message);
    }, [activeTab, onChange]);

    const triggerFitView = useCallback(() => {
        window.setTimeout(() => {
            rfInstance.current?.fitView({ padding: 0.2, duration: 300 });
        }, 50);
    }, []);

    useEffect(() => {
        setNodes((currentNodes) =>
            entities.map((entity, index) => {
                const existing = currentNodes.find((node) => node.id === entity.id);
                return {
                    id: entity.id,
                    type: "entity",
                    data: entity,
                    position: entity.position ?? existing?.position ?? getDefaultPosition(index),
                };
            }),
        );
    }, [entities, setNodes]);

    useEffect(() => {
        setEdges(
            relationships.flatMap((relationship) => {
                const source = entityById.get(relationship.fromEntityId);
                const target = entityById.get(relationship.toEntityId);
                if (!source || !target) return [];
                const endpointCardinality = getRelationshipEndpointLabels(relationship);
                const usesEndpointLabels = edgeLabelMode === "endpoint-cardinality";
                return [{
                    id: relationship.id,
                    source: relationship.fromEntityId,
                    target: relationship.toEntityId,
                    label: usesEndpointLabels ? undefined : `${relationship.name} (${relationship.cardinality})`,
                    data: usesEndpointLabels
                        ? {
                            relationshipName: relationship.name,
                            ...endpointCardinality,
                        }
                        : undefined,
                    type: usesEndpointLabels ? "endpointCardinality" : "smoothstep",
                    animated: true,
                    style: { strokeWidth: 2 },
                    markerEnd: usesEndpointLabels ? undefined : { type: MarkerType.ArrowClosed },
                    labelStyle: { fontSize: 11, fontWeight: 600, fill: "#334155" },
                    labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
                    labelBgPadding: [6, 3] as [number, number],
                    labelBgBorderRadius: 4,
                }];
            }),
        );
    }, [edgeLabelMode, entityById, relationships, setEdges]);

    const handleTabChange = (tab: WorkspaceTab) => {
        setActiveTab(tab);
        setJsonError(null);
        if (tab === "json") {
            setJsonDraft(JSON.stringify(diagramData, null, 2));
        }
        if (tab === "canvas") {
            triggerFitView();
        }
    };

    const handleAddEntity = () => {
        if (isLocked) return;
        const entity = createEntity(entities.length + 1);
        commitDiagram({ ...diagramData, entities: [...entities, entity] }, t("student.workspace.notices.entityAdded"));
        triggerFitView();
    };

    const handleSaveEntity = (entity: ErdEntity) => {
        if (isLocked) return;
        const exists = entities.some((item) => item.id === entity.id);
        const nextEntities = exists
            ? entities.map((item) => (item.id === entity.id ? entity : item))
            : [...entities, entity];
        commitDiagram(
            { ...diagramData, entities: nextEntities },
            exists ? t("student.workspace.notices.entityUpdated") : t("student.workspace.notices.entityAdded"),
        );
        setEntityToEdit(null);
        setIsEntityModalOpen(false);
    };

    const handleDeleteEntity = useCallback((entityId: string) => {
        if (isLocked) return;
        commitDiagram({
            ...diagramData,
            entities: entities.filter((entity) => entity.id !== entityId),
            relationships: relationships.filter(
                (relationship) => relationship.fromEntityId !== entityId && relationship.toEntityId !== entityId,
            ),
        }, t("student.workspace.notices.entityDeleted"));
    }, [commitDiagram, diagramData, entities, isLocked, relationships, t]);

    const handleSaveRelationship = (relationship: ErdRelationship) => {
        if (isLocked) return;
        const exists = relationships.some((item) => item.id === relationship.id);
        const duplicate = relationships.some((item) =>
            item.id !== relationship.id
            && item.fromEntityId === relationship.fromEntityId
            && item.toEntityId === relationship.toEntityId
            && item.name === relationship.name,
        );
        if (duplicate) {
            setNotice(t("student.workspace.notices.relationshipDuplicate"));
            return;
        }
        const nextRelationships = exists
            ? relationships.map((item) => (item.id === relationship.id ? relationship : item))
            : [...relationships, relationship];
        commitDiagram(
            { ...diagramData, relationships: nextRelationships },
            exists ? t("student.workspace.notices.relationshipUpdated") : t("student.workspace.notices.relationshipAdded"),
        );
        setRelationshipToEdit(null);
        setConnectionDraft(null);
        setIsRelationshipModalOpen(false);
    };

    const handleDeleteRelationship = useCallback((relationshipId: string) => {
        if (isLocked) return;
        commitDiagram({
            ...diagramData,
            relationships: relationships.filter((relationship) => relationship.id !== relationshipId),
        }, t("student.workspace.notices.relationshipDeleted"));
    }, [commitDiagram, diagramData, isLocked, relationships, t]);

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        if (isLocked) return;
        onNodesChange(changes);

        const removedIds = changes
            .filter((change) => change.type === "remove")
            .map((change) => change.id);
        if (removedIds.length > 0) {
            const removedIdSet = new Set(removedIds);
            commitDiagram({
                ...diagramData,
                entities: entities.filter((entity) => !removedIdSet.has(entity.id)),
                relationships: relationships.filter(
                    (relationship) =>
                        !removedIdSet.has(relationship.fromEntityId) && !removedIdSet.has(relationship.toEntityId),
                ),
            }, t("student.workspace.notices.entityDeletedFromCanvas"));
        }

        const positionChanges = changes.filter(
            (change): change is NodeChange & { id: string; position?: { x: number; y: number } } =>
                change.type === "position" && Boolean(change.position),
        );
        if (positionChanges.length > 0) {
            const positionById = new Map(positionChanges.map((change) => [change.id, change.position]));
            const nextEntities = entities.map((entity) => {
                const position = positionById.get(entity.id);
                return position ? { ...entity, position } : entity;
            });
            const nextData = touchDiagramData({ ...diagramData, entities: nextEntities });
            setDiagramData(nextData);
            onChange?.(nextData);
        }
    }, [commitDiagram, diagramData, entities, isLocked, onChange, onNodesChange, relationships, t]);

    const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
        if (isLocked) return;
        onEdgesChange(changes);
        changes.forEach((change) => {
            if (change.type === "remove") {
                handleDeleteRelationship(change.id);
            }
        });
    }, [handleDeleteRelationship, isLocked, onEdgesChange]);

    const handleConnect = useCallback((connection: Connection) => {
        if (isLocked) return;
        if (!connection.source || !connection.target || connection.source === connection.target) return;
        const exists = relationships.some(
            (relationship) =>
                relationship.fromEntityId === connection.source && relationship.toEntityId === connection.target,
        );
        if (exists) {
            setNotice(t("student.workspace.notices.relationshipExists"));
            return;
        }
        setConnectionDraft({ fromEntityId: connection.source, toEntityId: connection.target });
        setRelationshipToEdit(null);
        setIsRelationshipModalOpen(true);
    }, [isLocked, relationships, t]);

    const handleApplyJson = () => {
        if (isLocked) return;
        const result = parseDiagramJson(jsonDraft);
        if (!result.ok) {
            setJsonError("error" in result ? result.error : t("student.workspace.json.invalid"));
            return;
        }
        setJsonError(null);
        commitDiagram(result.data, result.warning ?? t("student.workspace.notices.jsonApplied"));
        triggerFitView();
    };

    const openEditEntity = (entity: ErdEntity) => {
        if (isLocked) return;
        setEntityToEdit(entity);
        setIsEntityModalOpen(true);
    };

    const openEditRelationship = (relationship: ErdRelationship) => {
        if (isLocked) return;
        setRelationshipToEdit(relationship);
        setConnectionDraft(null);
        setIsRelationshipModalOpen(true);
    };

    const resetEmpty = () => {
        if (isLocked) return;
        commitDiagram(createEmptyDiagramData(), t("student.workspace.notices.workspaceReset"));
    };

    return (
        <section className="erd-shell">
            <div className="erd-toolbar">
                <div className="erd-tabs">
                    <button className={`erd-tab${activeTab === "canvas" ? " erd-tab--active" : ""}`} type="button" onClick={() => handleTabChange("canvas")}>
                        Canvas
                    </button>
                    <button className={`erd-tab${activeTab === "manage" ? " erd-tab--active" : ""}`} type="button" onClick={() => handleTabChange("manage")}>
                        {t("student.workspace.tabs.manage")}
                    </button>
                    <button className={`erd-tab${activeTab === "json" ? " erd-tab--active" : ""}`} type="button" onClick={() => handleTabChange("json")}>
                        JSON
                    </button>
                </div>
                <div className="erd-toolbar__actions">
                    <button type="button" className="btn btn-outline" onClick={handleAddEntity} disabled={isLocked}>
                        {t("student.workspace.actions.addEntity")}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                            setRelationshipToEdit(null);
                            setConnectionDraft(null);
                            setIsRelationshipModalOpen(true);
                        }}
                        disabled={isLocked || entities.length < 2}
                    >
                        {t("student.workspace.actions.addRelationship")}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={triggerFitView} disabled={isEmpty}>
                        {t("student.workspace.actions.fitView")}
                    </button>
                </div>
            </div>

            {notice && <div className="erd-notice">{notice}</div>}
            {isLocked && <div className="erd-lock">{t("student.workspace.locked")}</div>}

            {activeTab === "canvas" && (
                <div className="erd-canvas-panel">
                    {isEmpty && (
                        <div className="erd-empty">
                            {t("student.workspace.emptyCanvas")}
                        </div>
                    )}
                    <div className={`erd-reactflow${isLocked ? " erd-reactflow--locked" : ""}`}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={handleEdgesChange}
                            onConnect={handleConnect}
                            onNodeDoubleClick={(_, node) => {
                                const entity = entityById.get(node.id);
                                if (entity) openEditEntity(entity);
                            }}
                            onEdgeDoubleClick={(_, edge: Edge) => {
                                const relationship = relationships.find((item) => item.id === edge.id);
                                if (relationship) openEditRelationship(relationship);
                            }}
                            onInit={(instance) => {
                                rfInstance.current = instance;
                            }}
                            nodesDraggable={!isLocked}
                            nodesConnectable={!isLocked}
                            elementsSelectable={!isLocked}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            defaultEdgeOptions={{
                                type: "smoothstep",
                                animated: true,
                                style: { strokeWidth: 2 },
                            }}
                        >
                            <Background />
                            <Controls />
                        </ReactFlow>
                    </div>
                    <div className="erd-help">
                        {t("student.workspace.canvasHelp")}
                    </div>
                </div>
            )}

            {activeTab === "manage" && (
                <div className="erd-manage-grid">
                    <div className="erd-panel">
                        <div className="erd-panel__header">
                            <h3>{t("student.workspace.entities")}</h3>
                            <button type="button" className="btn btn-outline" onClick={() => setIsEntityModalOpen(true)} disabled={isLocked}>
                                {t("student.workspace.actions.addEntity")}
                            </button>
                        </div>
                        {entities.length === 0 ? (
                            <div className="erd-empty">{t("student.workspace.noEntities")}</div>
                        ) : (
                            <div className="erd-card-list">
                                {entities.map((entity) => (
                                    <article className="erd-entity-card" key={entity.id}>
                                        <div className="erd-card__header">
                                            <strong>{entity.name}</strong>
                                            <div className="action-icons">
                                                <button type="button" className="btn-icon btn-icon--edit" onClick={() => openEditEntity(entity)} disabled={isLocked} title={t("student.workspace.actions.edit")}>
                                                    <Pencil size={14} />
                                                </button>
                                                <button type="button" className="btn-icon btn-icon--danger" onClick={() => handleDeleteEntity(entity.id)} disabled={isLocked} title={t("student.workspace.actions.delete")}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {entity.note && <p className="erd-card__note">{entity.note}</p>}
                                        {entity.attributes.length > 0 ? (
                                            <ul className="erd-attr-list">
                                                {entity.attributes.map((attribute) => (
                                                    <li key={attribute.id}>
                                                        {attribute.isPrimaryKey && <span className="erd-pk">PK</span>}
                                                        {attribute.name}
                                                        {attribute.dataType && <span className="erd-type">{attribute.dataType}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="erd-muted">{t("student.workspace.noAttributes")}</p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="erd-panel">
                        <div className="erd-panel__header">
                            <h3>{t("student.workspace.relationships")}</h3>
                            <button type="button" className="btn btn-outline" onClick={() => setIsRelationshipModalOpen(true)} disabled={isLocked || entities.length < 2}>
                                {t("student.workspace.actions.addRelationship")}
                            </button>
                        </div>
                        {relationships.length === 0 ? (
                            <div className="erd-empty">{t("student.workspace.noRelationships")}</div>
                        ) : (
                            <div className="erd-card-list">
                                {relationships.map((relationship) => {
                                    const from = entityById.get(relationship.fromEntityId)?.name ?? relationship.fromEntityId;
                                    const to = entityById.get(relationship.toEntityId)?.name ?? relationship.toEntityId;
                                    const cardinalitySummary = relationshipCardinalityMode === "per-end"
                                        ? formatRelationshipCardinalitySummary(relationship)
                                        : relationship.cardinality;
                                    return (
                                        <article className="erd-relationship-card" key={relationship.id}>
                                            <div className="erd-card__header">
                                                <strong>{relationship.name}</strong>
                                                <div className="action-icons">
                                                    <button type="button" className="btn-icon btn-icon--edit" onClick={() => openEditRelationship(relationship)} disabled={isLocked} title={t("student.workspace.actions.edit")}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button type="button" className="btn-icon btn-icon--danger" onClick={() => handleDeleteRelationship(relationship.id)} disabled={isLocked} title={t("student.workspace.actions.delete")}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="erd-card__meta">
                                                {from} {cardinalitySummary} {to}
                                            </div>
                                            {relationship.note && <p className="erd-card__note">{relationship.note}</p>}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "json" && (
                <div className="erd-json-panel">
                    <textarea
                        className="textarea textarea--code erd-json-textarea"
                        value={jsonDraft}
                        onChange={(event) => setJsonDraft(event.target.value)}
                        disabled={isLocked}
                    />
                    <div className="erd-json-actions">
                        <button type="button" className="btn btn-primary" onClick={handleApplyJson} disabled={isLocked}>
                            {t("student.workspace.json.apply")}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={resetEmpty} disabled={isLocked || isEmpty}>
                            {t("student.workspace.json.reset")}
                        </button>
                    </div>
                    {jsonError && <div className="erd-form__error">{jsonError}</div>}
                </div>
            )}

            {isEntityModalOpen && (
                <ErdEntityModal
                    key={entityToEdit?.id ?? "new-entity"}
                    isOpen={isEntityModalOpen}
                    initialData={entityToEdit}
                    isLocked={isLocked}
                    onClose={() => {
                        setIsEntityModalOpen(false);
                        setEntityToEdit(null);
                    }}
                    onSave={handleSaveEntity}
                />
            )}
            {isRelationshipModalOpen && (
                <ErdRelationshipModal
                    key={relationshipToEdit?.id ?? `${connectionDraft?.fromEntityId ?? "new"}-${connectionDraft?.toEntityId ?? "rel"}`}
                    isOpen={isRelationshipModalOpen}
                    entities={entities}
                    initialData={relationshipToEdit}
                    initialConnection={connectionDraft}
                    isLocked={isLocked}
                    cardinalityMode={relationshipCardinalityMode}
                    onClose={() => {
                        setIsRelationshipModalOpen(false);
                        setRelationshipToEdit(null);
                        setConnectionDraft(null);
                    }}
                    onSave={handleSaveRelationship}
                />
            )}
        </section>
    );
};

export default ErdWorkspaceEditor;
