import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ReactFlow, Background, Controls, MarkerType, useNodesState, useEdgesState } from "@xyflow/react";
import type { Connection, Edge, EdgeChange, Node, NodeChange, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { demoEntityPool, demoRelationshipPool } from "../services/demoAiResponses";
import type { DemoEntity, DemoRelationship } from "../services/demoAiResponses";
import DemoEntityCard from "./DemoEntityCard";
import DemoEntityModal from "./DemoEntityModal";
import DemoEntityNode from "./DemoEntityNode";
import DemoRelationshipModal from "./DemoRelationshipModal";
import DemoRelationshipPanel from "./DemoRelationshipPanel";

type DemoERDWorkspaceProps = {
    isLocked: boolean;
};

type WorkspaceTab = "reactflow" | "form" | "json" | "import-sql" | "import-image";

type Position = {
    x: number;
    y: number;
};

const nodeTypes = { entity: DemoEntityNode };

const getDefaultPosition = (index: number): Position => ({
    x: 80 + (index % 3) * 300,
    y: 80 + Math.floor(index / 3) * 220,
});

const isDemoEntity = (value: unknown): value is DemoEntity => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return (
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        Array.isArray(record.attributes) &&
        record.attributes.every((item) => typeof item === "string")
    );
};

const isDemoRelationship = (value: unknown): value is DemoRelationship => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return (
        typeof record.id === "string" &&
        typeof record.name === "string" &&
        typeof record.from === "string" &&
        typeof record.to === "string" &&
        typeof record.cardinality === "string"
    );
};

const DemoERDWorkspace = ({ isLocked }: DemoERDWorkspaceProps) => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("reactflow");
    const [entities, setEntities] = useState<DemoEntity[]>([]);
    const [relationships, setRelationships] = useState<DemoRelationship[]>([]);
    
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
    const [entityToEdit, setEntityToEdit] = useState<DemoEntity | null>(null);
    const [relationshipToEdit, setRelationshipToEdit] = useState<DemoRelationship | null>(null);
    
    const [jsonDraft, setJsonDraft] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonNotice, setJsonNotice] = useState<string | null>(null);

    const rfInstance = useRef<ReactFlowInstance | null>(null);

    const diagramData = useMemo(() => ({ entities, relationships }), [entities, relationships]);

    const triggerFitView = useCallback(() => {
        setTimeout(() => {
            rfInstance.current?.fitView({ padding: 0.2, duration: 300 });
        }, 50);
    }, []);

    const applyDiagram = useCallback((nextEntities: DemoEntity[], nextRelationships: DemoRelationship[]) => {
        setEntities(nextEntities);
        setRelationships(nextRelationships);
    }, []);

    // Sync entities -> nodes
    useEffect(() => {
        setNodes((nds) => {
            const nextNodes = entities.map((entity, index) => {
                const existing = nds.find((n) => n.id === entity.id);
                if (existing) {
                    return { ...existing, data: entity };
                }
                return {
                    id: entity.id,
                    type: "entity",
                    data: entity,
                    position: getDefaultPosition(index),
                };
            });
            return nextNodes;
        });
    }, [entities, setNodes]);

    // Sync relationships -> edges
    useEffect(() => {
        const nameToId = new Map(entities.map((entity) => [entity.name, entity.id]));
        setEdges((eds) => {
            const nextEdges = relationships.flatMap((relationship) => {
                const source = nameToId.get(relationship.from);
                const target = nameToId.get(relationship.to);
                if (!source || !target) return [];
                
                const edgeData = {
                    id: relationship.id,
                    source,
                    target,
                    label: `${relationship.name} (${relationship.cardinality})`,
                    type: "smoothstep",
                    animated: true,
                    style: { strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed },
                    labelStyle: { fontSize: 11, fontWeight: 500, fill: "#334155" },
                    labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
                    labelBgPadding: [6, 3] as [number, number],
                    labelBgBorderRadius: 4,
                };
                
                const existing = eds.find((e) => e.id === relationship.id);
                if (existing) {
                    return [{ ...existing, ...edgeData }];
                }
                return [edgeData];
            });
            return nextEdges;
        });
    }, [relationships, entities, setEdges]);

    const handleAutoFill = () => {
        if (isLocked) return;
        applyDiagram(demoEntityPool, demoRelationshipPool);
        setJsonNotice("Đã tự điền sơ đồ demo.");
        triggerFitView();
    };

    const handleTabChange = (tab: WorkspaceTab) => {
        setActiveTab(tab);
        if (tab === "json") {
            setJsonDraft(JSON.stringify(diagramData, null, 2));
            setJsonError(null);
            setJsonNotice(null);
        }
        if (tab === "import-sql" || tab === "import-image") {
            setJsonNotice(null);
        }
        if (tab === "reactflow") {
            triggerFitView();
        }
    };

    const handleDeleteEntity = useCallback((id: string) => {
        if (isLocked) return;
        setEntities((prev) => {
            const entityName = prev.find((e) => e.id === id)?.name;
            if (entityName) {
                // Remove relationships referencing this entity
                setRelationships((rels) => rels.filter((r) => r.from !== entityName && r.to !== entityName));
            }
            return prev.filter((e) => e.id !== id);
        });
        setJsonNotice("Đã xoá thực thể và quan hệ liên quan.");
    }, [isLocked]);

    const handleAddOrUpdateEntity = useCallback((entity: DemoEntity) => {
        if (isLocked) return;
        setEntities((prev) => {
            const index = prev.findIndex((e) => e.id === entity.id);
            if (index >= 0) {
                const oldName = prev[index].name;
                const next = [...prev];
                next[index] = entity;
                if (oldName !== entity.name) {
                    // Update related relationships if name changed
                    setRelationships((rels) => rels.map((r) => {
                        let updated = false;
                        const newR = { ...r };
                        if (newR.from === oldName) { newR.from = entity.name; updated = true; }
                        if (newR.to === oldName) { newR.to = entity.name; updated = true; }
                        return updated ? newR : r;
                    }));
                }
                return next;
            }
            return [...prev, entity];
        });
        setJsonNotice(entityToEdit ? "Đã cập nhật thực thể." : "Đã thêm thực thể mới.");
    }, [isLocked, entityToEdit]);

    const handleAddOrUpdateRelationship = useCallback((relationship: DemoRelationship) => {
        if (isLocked) return;
        setRelationships((prev) => {
            const index = prev.findIndex((r) => r.id === relationship.id);
            if (index >= 0) {
                const next = [...prev];
                next[index] = relationship;
                return next;
            }
            const exists = prev.some(
                (r) => r.from === relationship.from && r.to === relationship.to && r.name === relationship.name,
            );
            if (exists) return prev;
            return [...prev, relationship];
        });
        setJsonNotice(relationshipToEdit ? "Đã cập nhật quan hệ." : "Đã thêm quan hệ mới.");
    }, [isLocked, relationshipToEdit]);

    const handleDeleteRelationship = useCallback((id: string) => {
        if (isLocked) return;
        setRelationships((prev) => prev.filter((r) => r.id !== id));
        setJsonNotice("Đã xoá quan hệ.");
    }, [isLocked]);

    const handleQuickAddEntity = () => {
        if (isLocked) return;
        const nextIndex = entities.length + 1;
        handleAddOrUpdateEntity({
            id: `entity-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
            name: `Entity ${nextIndex}`,
            attributes: [],
        });
    };

    const handleConnect = useCallback(
        (connection: Connection) => {
            if (isLocked) return;
            if (!connection.source || !connection.target) return;
            if (connection.source === connection.target) return;

            const sourceEntity = entities.find((entity) => entity.id === connection.source);
            const targetEntity = entities.find((entity) => entity.id === connection.target);
            if (!sourceEntity || !targetEntity) return;

            const alreadyExists = relationships.some(
                (r) => r.from === sourceEntity.name && r.to === targetEntity.name,
            );
            if (alreadyExists) return;

            handleAddOrUpdateRelationship({
                id: `rel-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
                name: `relates_to`,
                from: sourceEntity.name,
                to: targetEntity.name,
                cardinality: "1 - N",
            });
        },
        [entities, relationships, handleAddOrUpdateRelationship, isLocked],
    );

    const handleApplyJson = () => {
        if (isLocked) return;
        if (!jsonDraft.trim()) return;

        try {
            const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
            const nextEntities = parsed.entities;
            const nextRelationships = parsed.relationships;

            if (!Array.isArray(nextEntities) || !Array.isArray(nextRelationships)) {
                throw new Error("Invalid format");
            }

            const typedEntities = nextEntities.filter(isDemoEntity);
            const typedRelationships = nextRelationships.filter(isDemoRelationship);

            if (typedEntities.length !== nextEntities.length || typedRelationships.length !== nextRelationships.length) {
                throw new Error("Invalid format");
            }

            applyDiagram(typedEntities, typedRelationships);
            setJsonError(null);
            setJsonNotice("Đã cập nhật sơ đồ từ JSON.");
            triggerFitView();
        } catch {
            setJsonError("JSON không hợp lệ. Hãy dùng định dạng { entities: [], relationships: [] }.");
        }
    };

    const handleWorkspaceNodesChange = useCallback((changes: NodeChange[]) => {
        if (isLocked) return;
        onNodesChange(changes);
        changes.forEach((change) => {
            if (change.type === "remove") {
                handleDeleteEntity(change.id);
            }
        });
    }, [isLocked, onNodesChange, handleDeleteEntity]);

    const handleWorkspaceEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (isLocked) return;
            onEdgesChange(changes);
            changes.forEach((change) => {
                if (change.type === "remove") {
                    handleDeleteRelationship(change.id);
                }
            });
        },
        [isLocked, onEdgesChange, handleDeleteRelationship],
    );

    const openEditEntity = useCallback((entity: DemoEntity) => {
        if (isLocked) return;
        setEntityToEdit(entity);
        setIsEntityModalOpen(true);
    }, [isLocked]);

    const openEditRelationship = useCallback((relationship: DemoRelationship) => {
        if (isLocked) return;
        setRelationshipToEdit(relationship);
        setIsRelationshipModalOpen(true);
    }, [isLocked]);

    const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
        const entity = entities.find((e) => e.id === node.id);
        if (entity) openEditEntity(entity);
    }, [entities, openEditEntity]);

    const handleEdgeDoubleClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        const relationship = relationships.find((r) => r.id === edge.id);
        if (relationship) openEditRelationship(relationship);
    }, [relationships, openEditRelationship]);

    const handleSaveEntity = (entity: DemoEntity) => {
        handleAddOrUpdateEntity(entity);
        setIsEntityModalOpen(false);
        setEntityToEdit(null);
    };

    const handleSaveRelationship = (relationship: DemoRelationship) => {
        handleAddOrUpdateRelationship(relationship);
        setIsRelationshipModalOpen(false);
        setRelationshipToEdit(null);
    };

    const handleCloseEntityModal = () => {
        setIsEntityModalOpen(false);
        setEntityToEdit(null);
    };

    const handleCloseRelationshipModal = () => {
        setIsRelationshipModalOpen(false);
        setRelationshipToEdit(null);
    };

    const isEmpty = entities.length === 0 && relationships.length === 0;
    const canCreateRelationship = !isLocked && entities.length >= 2;

    return (
        <section className="section-card demo-section demo-workspace-shell">
            <div className="demo-section__header">
                <div>
                    <h3 className="demo-section__title">Khu vực thực hành ERD</h3>
                    <p className="demo-section__subtitle">
                        Demo vẽ trên trình duyệt: React Flow, form quản lý, và chỉnh sửa JSON.
                    </p>
                </div>
                <div className="demo-badge-row">
                    <span className="demo-badge">Demo sơ đồ</span>
                    {isLocked && <span className="demo-badge demo-badge--lock">Đang khóa</span>}
                </div>
            </div>

            <div className="demo-action-row">
                <button type="button" className="btn btn-outline" onClick={handleAutoFill} disabled={isLocked}>
                    Tự điền sơ đồ demo
                </button>
                {jsonNotice && <span className="demo-form__note">{jsonNotice}</span>}
            </div>

            {isLocked && (
                <div className="demo-lock-banner">
                    Khu vực thiết kế đang khóa sau khi nộp bài. Nhấn &quot;Sửa bài&quot; để mở lại.
                </div>
            )}

            <div className="demo-tabs">
                <button
                    type="button"
                    className={`demo-tab${activeTab === "reactflow" ? " demo-tab--active" : ""}`}
                    onClick={() => handleTabChange("reactflow")}
                >
                    Vẽ React Flow
                </button>
                <button
                    type="button"
                    className={`demo-tab${activeTab === "form" ? " demo-tab--active" : ""}`}
                    onClick={() => handleTabChange("form")}
                >
                    Quản lý thực thể
                </button>
                <button
                    type="button"
                    className={`demo-tab${activeTab === "json" ? " demo-tab--active" : ""}`}
                    onClick={() => handleTabChange("json")}
                >
                    Chỉnh sửa JSON
                </button>
                <button
                    type="button"
                    className={`demo-tab${activeTab === "import-sql" ? " demo-tab--active" : ""}`}
                    onClick={() => handleTabChange("import-sql")}
                >
                    Import SQL
                </button>
                <button
                    type="button"
                    className={`demo-tab${activeTab === "import-image" ? " demo-tab--active" : ""}`}
                    onClick={() => handleTabChange("import-image")}
                >
                    Import hình ảnh
                </button>
            </div>

            {activeTab === "reactflow" && (
                <div className="demo-tab-panel">
                    <div className="demo-reactflow-toolbar">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleQuickAddEntity}
                            disabled={isLocked}
                        >
                            + Entity
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => triggerFitView()}
                            disabled={isEmpty}
                        >
                            Fit View
                        </button>
                        <span className="demo-form__note">
                            {canCreateRelationship
                                ? "Kéo từ handle (●) bên phải entity sang handle bên trái entity khác để tạo quan hệ. Bấm Delete/Backspace trên node để xoá."
                                : entities.length < 2
                                    ? "Thêm ít nhất 2 entity để tạo quan hệ bằng kéo nối."
                                    : "Dùng toolbox để thêm thực thể."}
                        </span>
                    </div>
                    {isEmpty && (
                        <div className="demo-empty">
                            Chưa có sơ đồ. Hãy thêm thực thể ở tab quản lý hoặc tự điền demo.
                        </div>
                    )}
                    <div className={`demo-reactflow${isLocked ? " demo-reactflow--locked" : ""}`}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            onNodesChange={handleWorkspaceNodesChange}
                            onEdgesChange={handleWorkspaceEdgesChange}
                            onConnect={handleConnect}
                            onNodeDoubleClick={handleNodeDoubleClick}
                            onEdgeDoubleClick={handleEdgeDoubleClick}
                            onInit={(instance) => {
                                rfInstance.current = instance;
                            }}
                            nodesDraggable={!isLocked}
                            nodesConnectable={!isLocked}
                            elementsSelectable={!isLocked}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            style={{ width: "100%", height: "100%" }}
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
                    <div className="demo-form__note">
                        Kéo thả node để điều chỉnh vị trí. Kéo nối handle để tạo quan hệ. Nhấp đúp vào node/edge để chỉnh sửa. Quan hệ đồng bộ với tab quản lý và JSON.
                    </div>
                </div>
            )}

            {activeTab === "form" && (
                <div className="demo-tab-panel">
                    <div className="demo-workspace-grid">
                        <div className="demo-workspace-panel">
                            <div className="demo-panel-header">
                                <h4 className="demo-block-title">Thực thể</h4>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setIsEntityModalOpen(true)}
                                    disabled={isLocked}
                                >
                                    Thêm thực thể
                                </button>
                            </div>
                            <div className="demo-form__note">
                                {isLocked
                                    ? "Khu vực đang bị khóa."
                                    : "Nhấn Thêm thực thể để mở popup nhập dữ liệu."}
                            </div>

                            {isEmpty ? (
                                <div className="demo-empty">Chưa có thực thể nào. Hãy tạo thực thể đầu tiên.</div>
                            ) : (
                                <div className="demo-entity-grid">
                                    {entities.map((entity) => (
                                        <DemoEntityCard
                                            key={entity.id}
                                            entity={entity}
                                            onEdit={() => openEditEntity(entity)}
                                            onDelete={() => handleDeleteEntity(entity.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <DemoRelationshipPanel
                            entities={entities}
                            relationships={relationships}
                            isLocked={isLocked}
                            onOpenCreate={() => setIsRelationshipModalOpen(true)}
                            onEdit={openEditRelationship}
                            onDelete={handleDeleteRelationship}
                        />
                    </div>
                    {!canCreateRelationship && (
                        <div className="demo-form__note">
                            Cần tối thiểu 2 thực thể để tạo quan hệ.
                        </div>
                    )}
                </div>
            )}

            {activeTab === "json" && (
                <div className="demo-tab-panel">
                    <div className="demo-json-editor">
                        <div className="demo-block-title">diagramData (JSON)</div>
                        <textarea
                            className="textarea"
                            rows={8}
                            value={jsonDraft}
                            onChange={(event) => setJsonDraft(event.target.value)}
                            disabled={isLocked}
                        />
                        <div className="demo-mini-form__actions">
                            <button type="button" className="btn btn-outline" onClick={handleApplyJson} disabled={isLocked}>
                                Áp dụng JSON
                            </button>
                            <span className="demo-form__note">Chỉnh sửa và áp dụng để cập nhật sơ đồ.</span>
                        </div>
                        {jsonError && <div className="demo-form__error">{jsonError}</div>}
                    </div>
                </div>
            )}

            {activeTab === "import-sql" && (
                <div className="demo-tab-panel">
                    <div className="demo-under-dev">Import SQL đang được phát triển.</div>
                </div>
            )}

            {activeTab === "import-image" && (
                <div className="demo-tab-panel">
                    <div className="demo-under-dev">Import hình ảnh đang được phát triển.</div>
                </div>
            )}

            <DemoEntityModal
                isOpen={isEntityModalOpen}
                isLocked={isLocked}
                initialData={entityToEdit}
                onClose={handleCloseEntityModal}
                onSave={handleSaveEntity}
            />
            <DemoRelationshipModal
                isOpen={isRelationshipModalOpen}
                isLocked={isLocked}
                entities={entities}
                initialData={relationshipToEdit}
                onClose={handleCloseRelationshipModal}
                onSave={handleSaveRelationship}
            />
        </section>
    );
};

export default DemoERDWorkspace;
