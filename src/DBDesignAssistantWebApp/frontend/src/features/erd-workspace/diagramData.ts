import type { DiagramParseResult, ErdAttribute, ErdDiagramData, ErdEntity, ErdRelationship } from "./types";

const DEFAULT_VERSION = 1 as const;

const createId = (prefix: string) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;

export const createEmptyDiagramData = (): ErdDiagramData => ({
    entities: [],
    relationships: [],
    metadata: {
        version: DEFAULT_VERSION,
        updatedAt: new Date().toISOString(),
    },
});

export const touchDiagramData = (data: ErdDiagramData): ErdDiagramData => ({
    entities: data.entities,
    relationships: data.relationships,
    metadata: {
        version: DEFAULT_VERSION,
        updatedAt: new Date().toISOString(),
    },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown, fallback = "") =>
    typeof value === "string" ? value.trim() : fallback;

export const normalizeEndpointCardinalityValue = (value: string) => {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
    if (normalized === "1" || normalized === "1-1" || normalized === "1..1") return "1-1";
    if (normalized === "0-1" || normalized === "0..1") return "0-1";
    if (normalized === "1-N" || normalized === "1..N") return "1-N";
    if (normalized === "0-N" || normalized === "0..N") return "0-N";
    if (normalized === "N" || normalized === "M" || normalized === "*") return "0-N";
    return "";
};

const parseEndpointCardinalitySide = (value: string | undefined, fallback: string) =>
    normalizeEndpointCardinalityValue(value ?? "") || fallback;

export const parseRelationshipEndpointCardinalities = (cardinality: string) => {
    const trimmed = cardinality.trim();
    const parts = /\s+-\s+/.test(trimmed)
        ? trimmed.split(/\s+-\s+/)
        : trimmed.split("-");

    return {
        sourceCardinality: parseEndpointCardinalitySide(parts[0], "1-1"),
        targetCardinality: parseEndpointCardinalitySide(parts[1], "0-N"),
    };
};

export const formatEndpointCardinalityLabel = (value: string) => {
    const normalized = normalizeEndpointCardinalityValue(value);
    return normalized || value.trim() || "0-N";
};

const normalizeAttribute = (value: unknown, index: number): ErdAttribute | null => {
    if (typeof value === "string") {
        const name = value.trim();
        if (!name) return null;
        const isPrimaryKey = name.toUpperCase().includes("(PK)");
        return {
            id: createId(`attr-${index}`),
            name: name.replace(/\s*\(PK\)\s*/i, "").trim() || name,
            isPrimaryKey,
        };
    }

    if (!isRecord(value)) return null;
    const name = readString(value.name);
    if (!name) return null;

    return {
        id: readString(value.id, createId(`attr-${index}`)),
        name,
        isPrimaryKey: value.isPrimaryKey === true || value.primaryKey === true,
        dataType: readString(value.dataType) || undefined,
        note: readString(value.note) || undefined,
    };
};

const normalizeEntity = (value: unknown, index: number): ErdEntity | null => {
    if (!isRecord(value)) return null;
    const name = readString(value.name);
    if (!name) return null;

    const attributes = Array.isArray(value.attributes)
        ? value.attributes.flatMap((item, attrIndex) => {
            const attr = normalizeAttribute(item, attrIndex);
            return attr ? [attr] : [];
        })
        : [];

    const position = isRecord(value.position)
        && typeof value.position.x === "number"
        && typeof value.position.y === "number"
        ? { x: value.position.x, y: value.position.y }
        : undefined;

    return {
        id: readString(value.id, createId(`entity-${index}`)),
        name,
        attributes,
        note: readString(value.note) || undefined,
        position,
    };
};

const normalizeRelationship = (
    value: unknown,
    index: number,
    entityIdByName: Map<string, string>,
): ErdRelationship | null => {
    if (!isRecord(value)) return null;

    const fromEntityId = readString(value.fromEntityId)
        || entityIdByName.get(readString(value.from)) || "";
    const toEntityId = readString(value.toEntityId)
        || entityIdByName.get(readString(value.to)) || "";

    if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) return null;

    const cardinality = readString(value.cardinality, "1 - N");
    const fallbackCardinality = parseRelationshipEndpointCardinalities(cardinality);
    const sourceCardinality = normalizeEndpointCardinalityValue(readString(value.sourceCardinality))
        || fallbackCardinality.sourceCardinality;
    const targetCardinality = normalizeEndpointCardinalityValue(readString(value.targetCardinality))
        || fallbackCardinality.targetCardinality;

    return {
        id: readString(value.id, createId(`rel-${index}`)),
        name: readString(value.name, "relates_to"),
        fromEntityId,
        toEntityId,
        cardinality,
        sourceCardinality,
        targetCardinality,
        note: readString(value.note) || undefined,
    };
};

export const normalizeDiagramData = (value: unknown): DiagramParseResult => {
    const empty = createEmptyDiagramData();

    if (value == null) {
        return { ok: true, data: empty };
    }

    if (!isRecord(value)) {
        return {
            ok: false,
            data: empty,
            error: "diagramData không đúng định dạng object. Workspace đã tạo sơ đồ rỗng để bạn tiếp tục làm bài.",
        };
    }

    if (Object.keys(value).length === 0) {
        return { ok: true, data: empty };
    }

    if (!Array.isArray(value.entities) && !Array.isArray(value.relationships)) {
        return {
            ok: false,
            data: empty,
            error: "diagramData thiếu trường entities/relationships. Workspace đã tạo sơ đồ rỗng để tránh crash.",
        };
    }

    const entities = Array.isArray(value.entities)
        ? value.entities.flatMap((item, index) => {
            const entity = normalizeEntity(item, index);
            return entity ? [entity] : [];
        })
        : [];

    const entityIdByName = new Map(entities.map((entity) => [entity.name, entity.id]));
    const entityIds = new Set(entities.map((entity) => entity.id));

    const relationships = Array.isArray(value.relationships)
        ? value.relationships.flatMap((item, index) => {
            const relationship = normalizeRelationship(item, index, entityIdByName);
            if (!relationship) return [];
            if (!entityIds.has(relationship.fromEntityId) || !entityIds.has(relationship.toEntityId)) return [];
            return [relationship];
        })
        : [];

    const metadata = isRecord(value.metadata)
        ? {
            version: DEFAULT_VERSION,
            updatedAt: readString(value.metadata.updatedAt, new Date().toISOString()),
        }
        : {
            version: DEFAULT_VERSION,
            updatedAt: new Date().toISOString(),
        };

    const ignoredItems = (
        (Array.isArray(value.entities) ? value.entities.length : 0) - entities.length
        + (Array.isArray(value.relationships) ? value.relationships.length : 0) - relationships.length
    );

    return {
        ok: true,
        data: { entities, relationships, metadata },
        warning: ignoredItems > 0
            ? "Một số entity/relationship không hợp lệ đã được bỏ qua khi tải workspace."
            : undefined,
    };
};

export const parseDiagramJson = (value: string): DiagramParseResult => {
    try {
        return normalizeDiagramData(JSON.parse(value));
    } catch {
        return {
            ok: false,
            data: createEmptyDiagramData(),
            error: "JSON không hợp lệ. Hãy kiểm tra dấu ngoặc, dấu phẩy và định dạng diagramData.",
        };
    }
};

export const createEntity = (index: number): ErdEntity => ({
    id: createId("entity"),
    name: `Entity ${index}`,
    attributes: [],
});

export const createRelationship = (
    fromEntityId: string,
    toEntityId: string,
    name = "relates_to",
): ErdRelationship => ({
    id: createId("rel"),
    name,
    fromEntityId,
    toEntityId,
    cardinality: "1 - N",
});
