import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import type { DemoEntity } from "../services/demoAiResponses";

type DemoEntityNodeData = Node<DemoEntity, "entity">;

const DemoEntityNode = ({ data }: NodeProps<DemoEntityNodeData>) => {
    const hasAttributes = data.attributes.length > 0;

    return (
        <div className="demo-entity-node">
            <Handle
                type="target"
                position={Position.Left}
                className="demo-entity-node__handle"
            />

            <div className="demo-entity-node__header">
                {data.name}
            </div>

            <div className="demo-entity-node__body">
                {hasAttributes ? (
                    <ul className="demo-entity-node__attrs">
                        {data.attributes.map((attr) => {
                            const isPk = attr.toUpperCase().includes("(PK)");
                            return (
                                <li key={attr} className={`demo-entity-node__attr${isPk ? " demo-entity-node__attr--pk" : ""}`}>
                                    {isPk && <span className="demo-entity-node__pk-badge">PK</span>}
                                    {attr}
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="demo-entity-node__empty">
                        Chưa có thuộc tính
                    </div>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="demo-entity-node__handle"
            />
        </div>
    );
};

export default memo(DemoEntityNode);
