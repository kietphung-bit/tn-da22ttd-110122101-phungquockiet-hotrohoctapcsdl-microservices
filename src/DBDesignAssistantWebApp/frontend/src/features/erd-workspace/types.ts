export type ErdAttribute = {
    id: string;
    name: string;
    isPrimaryKey?: boolean;
    dataType?: string;
    note?: string;
};

export type ErdEntity = {
    id: string;
    name: string;
    attributes: ErdAttribute[];
    note?: string;
    position?: {
        x: number;
        y: number;
    };
};

export type ErdRelationship = {
    id: string;
    name: string;
    fromEntityId: string;
    toEntityId: string;
    cardinality: string;
    sourceCardinality?: string;
    targetCardinality?: string;
    note?: string;
};

export type ErdDiagramMetadata = {
    version: 1;
    updatedAt: string;
};

export type ErdDiagramData = {
    entities: ErdEntity[];
    relationships: ErdRelationship[];
    metadata: ErdDiagramMetadata;
};

export type DiagramParseResult =
    | {
        ok: true;
        data: ErdDiagramData;
        warning?: string;
    }
    | {
        ok: false;
        data: ErdDiagramData;
        error: string;
    };
