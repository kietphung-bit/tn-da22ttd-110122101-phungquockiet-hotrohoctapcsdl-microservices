from typing import Any


def evaluate_diagram(diagram_data: dict[str, Any] | None) -> tuple[float, list[dict[str, str]]]:
    data = diagram_data or {}
    entities = _read_object_list(data, "entities")
    relationships = _read_object_list(data, "relationships")
    details: list[dict[str, str]] = []

    if not entities:
        details.append(
            _detail(
                "MISSING_ENTITY",
                "Diagram chua co entity nao. Hay xac dinh cac doi tuong chinh trong de bai truoc khi thiet ke relationship.",
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
                    "Entity nen co primary key de dinh danh moi ban ghi mot cach ro rang.",
                    f"Entity: {entity_name}",
                )
            )

    if not relationships:
        details.append(
            _detail(
                "MISSING_RELATIONSHIP",
                "Diagram chua co relationship. Hay mo ta lien ket va rang buoc giua cac entity neu de bai co nhieu doi tuong.",
                "Relationships",
            )
        )

    for relationship in relationships:
        relationship_name = _read_string(relationship, "name", "Unnamed relationship")
        cardinality = _read_string(relationship, "cardinality", "")
        if not cardinality:
            details.append(
                _detail(
                    "MISSING_CARDINALITY",
                    "Relationship can co cardinality de the hien rang buoc 1-1, 1-N, N-1 hoac N-N.",
                    f"Relationship: {relationship_name}",
                )
            )
            continue

        normalized_cardinality = cardinality.upper().replace(" ", "")
        if normalized_cardinality in {"N-N", "M-N"}:
            details.append(
                _detail(
                    "MANY_TO_MANY_HINT",
                    "Relationship N-N thuong can can nhac bang trung gian khi chuyen sang thiet ke logic.",
                    f"Relationship: {relationship_name}",
                )
            )

    if not details:
        details.append(
            _detail(
                "MOCK_PASS",
                "Danh gia demo/MOCK khong phat hien loi cau truc co ban trong diagram hien tai.",
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
