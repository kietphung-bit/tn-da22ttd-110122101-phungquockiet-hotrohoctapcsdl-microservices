import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import type { ErdEntity } from "./types";

type ErdEntityNodeData = Node<ErdEntity, "entity">;

const ErdEntityNode = ({ data }: NodeProps<ErdEntityNodeData>) => {
    const { t } = useTranslation();
    const hasAttributes = data.attributes.length > 0;

    return (
        <div className="erd-entity-node">
            <Handle type="target" position={Position.Left} className="erd-entity-node__handle" />
            <div className="erd-entity-node__header">{data.name}</div>
            <div className="erd-entity-node__body">
                {hasAttributes ? (
                    <ul className="erd-entity-node__attrs">
                        {data.attributes.map((attribute) => (
                            <li
                                key={attribute.id}
                                className={`erd-entity-node__attr${attribute.isPrimaryKey ? " erd-entity-node__attr--pk" : ""}`}
                            >
                                {attribute.isPrimaryKey && <span className="erd-entity-node__pk-badge">PK</span>}
                                <span>{attribute.name}</span>
                                {attribute.dataType && <span className="erd-entity-node__type">{attribute.dataType}</span>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="erd-entity-node__empty">{t("student.workspace.noAttributes")}</div>
                )}
            </div>
            <Handle type="source" position={Position.Right} className="erd-entity-node__handle" />
        </div>
    );
};

export default memo(ErdEntityNode);
