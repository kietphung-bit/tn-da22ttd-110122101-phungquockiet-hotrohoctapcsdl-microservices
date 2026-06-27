import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
} from "@xyflow/react";
import type { Edge, EdgeProps } from "@xyflow/react";

export type ErdEndpointCardinalityEdgeData = {
    relationshipName: string;
    sourceCardinality: string;
    targetCardinality: string;
};

export type ErdEndpointCardinalityEdgeType = Edge<
    ErdEndpointCardinalityEdgeData,
    "endpointCardinality"
>;

const getEndpointLabelPosition = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    ratio: number,
) => {
    const deltaX = targetX - sourceX;
    const deltaY = targetY - sourceY;
    const mostlyHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);

    return {
        x: sourceX + deltaX * ratio + (mostlyHorizontal ? 0 : 24),
        y: sourceY + deltaY * ratio + (mostlyHorizontal ? -18 : 0),
    };
};

const ErdEndpointCardinalityEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    markerStart,
    interactionWidth,
    style,
    data,
}: EdgeProps<ErdEndpointCardinalityEdgeType>) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 18,
    });
    const sourceLabelPosition = getEndpointLabelPosition(sourceX, sourceY, targetX, targetY, 0.1);
    const targetLabelPosition = getEndpointLabelPosition(sourceX, sourceY, targetX, targetY, 0.9);

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerStart={markerStart}
                markerEnd={markerEnd}
                interactionWidth={interactionWidth}
                style={{
                    strokeWidth: 2,
                    ...style,
                }}
            />
            <EdgeLabelRenderer>
                <div
                    className="erd-edge-label erd-edge-label--name"
                    style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                >
                    {data?.relationshipName ?? "relates_to"}
                </div>
                <div
                    className="erd-edge-label erd-edge-label--cardinality"
                    style={{
                        transform: `translate(-50%, -50%) translate(${sourceLabelPosition.x}px, ${sourceLabelPosition.y}px)`,
                    }}
                >
                    {data?.sourceCardinality ?? "1"}
                </div>
                <div
                    className="erd-edge-label erd-edge-label--cardinality"
                    style={{
                        transform: `translate(-50%, -50%) translate(${targetLabelPosition.x}px, ${targetLabelPosition.y}px)`,
                    }}
                >
                    {data?.targetCardinality ?? "0-N"}
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default ErdEndpointCardinalityEdge;
