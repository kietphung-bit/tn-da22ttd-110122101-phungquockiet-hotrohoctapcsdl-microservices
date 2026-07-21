import re
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RelationshipCardinality:
    source: str
    target: str

    @property
    def has_cardinality(self) -> bool:
        return bool(self.source and self.target)

    @property
    def is_many_to_many(self) -> bool:
        return self.source in {"1-N", "0-N"} and self.target in {"1-N", "0-N"}

    @property
    def summary(self) -> str:
        if not self.has_cardinality:
            return ""
        return f"{self.source} - {self.target}"


def evaluate_diagram(diagram_data: dict[str, Any] | None) -> tuple[float, list[dict[str, str]]]:
    data = diagram_data or {}
    entities = _read_object_list(data, "entities")
    relationships = _read_object_list(data, "relationships")
    details: list[dict[str, str]] = []

    if not entities:
        details.append(
            _detail(
                "MISSING_ENTITY",
                "Sơ đồ chưa có entity nào. Hãy xác định các đối tượng chính trong đề bài trước khi thiết kế relationship.",
                "Diagram",
            )
        )

    for entity in entities:
        entity_name = _read_string(entity, "name", "Unnamed entity")
        attributes = _read_object_list(entity, "attributes")
        has_primary_key = any(attribute.get("isPrimaryKey") is True for attribute in attributes)
        if not has_primary_key:
            details.append(
                _detail(
                    "MISSING_PRIMARY_KEY",
                    "Entity nên có primary key để định danh mỗi bản ghi một cách rõ ràng.",
                    f"Entity: {entity_name}",
                )
            )

    if not relationships:
        details.append(
            _detail(
                "MISSING_RELATIONSHIP",
                "Sơ đồ chưa có relationship. Hãy mô tả liên kết và ràng buộc giữa các entity nếu đề bài có nhiều đối tượng.",
                "Relationships",
            )
        )

    for relationship in relationships:
        relationship_name = _read_string(relationship, "name", "Unnamed relationship")
        cardinality = normalize_relationship_cardinality(relationship)
        if not cardinality.has_cardinality:
            details.append(
                _detail(
                    "MISSING_CARDINALITY",
                    "Relationship cần có cardinality để thể hiện ràng buộc mỗi đầu: 1-1, 0-1, 1-N hoặc 0-N.",
                    f"Relationship: {relationship_name}",
                )
            )
            continue

        if cardinality.is_many_to_many:
            details.append(
                _detail(
                    "MANY_TO_MANY_HINT",
                    "Relationship có nhiều bản ghi ở cả hai đầu thường cần cân nhắc bảng trung gian khi chuyển sang thiết kế logic.",
                    f"Relationship: {relationship_name}",
                )
            )

    if not details:
        details.append(
            _detail(
                "MOCK_PASS",
                "Đánh giá MOCK chưa phát hiện lỗi cấu trúc cơ bản trong sơ đồ hiện tại.",
                "Diagram",
            )
        )

    return _calculate_score(details), details


def _calculate_score(details: list[dict[str, str]]) -> float:
    penalties = {
        "MISSING_ENTITY": 40,
        "MISSING_PRIMARY_KEY": 15,
        "MISSING_RELATIONSHIP": 15,
        "MISSING_CARDINALITY": 10,
        "MANY_TO_MANY_HINT": 5,
    }
    penalty = sum(penalties.get(detail["error_type"], 0) for detail in details)
    return float(max(0, 100 - penalty))


def _detail(error_type: str, description: str, location: str) -> dict[str, str]:
    return {
        "error_type": error_type,
        "description": description,
        "location": location,
    }


def normalize_diagram_relationship_cardinalities(diagram_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(diagram_data, dict):
        return {}

    normalized = dict(diagram_data)
    relationships = diagram_data.get("relationships")
    if not isinstance(relationships, list):
        return normalized

    normalized_relationships: list[Any] = []
    for relationship in relationships:
        if not isinstance(relationship, dict):
            normalized_relationships.append(relationship)
            continue

        next_relationship = dict(relationship)
        cardinality = normalize_relationship_cardinality(relationship)
        if cardinality.has_cardinality:
            next_relationship["sourceCardinality"] = cardinality.source
            next_relationship["targetCardinality"] = cardinality.target
            next_relationship["normalizedCardinality"] = {
                "source": cardinality.source,
                "target": cardinality.target,
                "summary": cardinality.summary,
                "isManyToMany": cardinality.is_many_to_many,
            }
        normalized_relationships.append(next_relationship)

    normalized["relationships"] = normalized_relationships
    return normalized


def normalize_relationship_cardinality(relationship: dict[str, Any]) -> RelationshipCardinality:
    source = normalize_endpoint_cardinality_value(_read_string(relationship, "sourceCardinality", ""))
    target = normalize_endpoint_cardinality_value(_read_string(relationship, "targetCardinality", ""))
    if source and target:
        return RelationshipCardinality(source=source, target=target)

    return _parse_relationship_cardinality(_read_string(relationship, "cardinality", ""))


def normalize_endpoint_cardinality_value(value: str) -> str:
    normalized = re.sub(r"\s+", "", value.strip().upper())
    if normalized in {"1", "1-1", "1..1"}:
        return "1-1"
    if normalized in {"0-1", "0..1"}:
        return "0-1"
    if normalized in {"1-N", "1-M", "1..N", "1..M"}:
        return "1-N"
    if normalized in {"0-N", "0-M", "0..N", "0..M"}:
        return "0-N"
    if normalized in {"N", "M", "*"}:
        return "0-N"
    return ""


def _parse_relationship_cardinality(cardinality: str) -> RelationshipCardinality:
    trimmed = cardinality.strip()
    if not trimmed:
        return RelationshipCardinality(source="", target="")

    parts = re.split(r"\s+-\s+", trimmed) if re.search(r"\s+-\s+", trimmed) else trimmed.split("-")
    if len(parts) < 2:
        return RelationshipCardinality(source="", target="")

    source = normalize_endpoint_cardinality_value(parts[0])
    target = normalize_endpoint_cardinality_value(parts[1])
    return RelationshipCardinality(source=source, target=target)


def _read_object_list(source: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = source.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _read_string(source: dict[str, Any], key: str, fallback: str) -> str:
    value = source.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback
