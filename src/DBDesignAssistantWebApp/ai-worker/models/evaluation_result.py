from typing import Any

from pydantic import BaseModel, Field, field_validator


class EvaluationDetailResult(BaseModel):
    error_type: str = Field(alias="errorType")
    eva_description: str = Field(alias="evaDescription")
    error_location: str = Field(alias="errorLocation")

    class Config:
        populate_by_name = True

    @field_validator("error_type", "eva_description", "error_location", mode="before")
    @classmethod
    def normalize_string(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()


class EvaluationResult(BaseModel):
    overall_score: float = Field(alias="overallScore")
    details: list[EvaluationDetailResult] = Field(default_factory=list)
    error_type: str = Field(default="GENERAL_HINT", alias="errorType")
    eva_description: str = Field(default="", alias="evaDescription")
    error_location: str = Field(default="Diagram", alias="errorLocation")
    provider: str = "MOCK"
    model: str | None = None
    fallback_used: bool = Field(default=False, alias="fallbackUsed")
    fallback_from: str | None = Field(default=None, alias="fallbackFrom")

    class Config:
        populate_by_name = True

    @field_validator("overall_score", mode="before")
    @classmethod
    def normalize_score(cls, value: Any) -> float:
        try:
            score = float(value)
        except (TypeError, ValueError):
            score = 0.0
        return min(100.0, max(0.0, score))

    @field_validator("error_type", "eva_description", "error_location", mode="before")
    @classmethod
    def normalize_string(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value).strip()

    def normalized_details(self) -> list[EvaluationDetailResult]:
        cleaned = [
            detail
            for detail in self.details
            if detail.error_type and detail.eva_description and detail.error_location
        ]
        if cleaned:
            return cleaned
        return [
            EvaluationDetailResult(
                errorType=self.error_type or "GENERAL_HINT",
                evaDescription=self.eva_description
                or "Hay xem lai tung thanh phan trong diagram va tu doi chieu voi yeu cau de bai.",
                errorLocation=self.error_location or "Diagram",
            )
        ]

    def to_persistence_details(self) -> list[dict[str, str]]:
        return [
            {
                "error_type": detail.error_type[:100],
                "description": detail.eva_description[:1000],
                "location": detail.error_location[:255],
            }
            for detail in self.normalized_details()
        ]


def result_from_mock(score: float, details: list[dict[str, str]]) -> EvaluationResult:
    mapped_details = [
        EvaluationDetailResult(
            errorType=detail.get("error_type", "GENERAL_HINT"),
            evaDescription=detail.get("description", ""),
            errorLocation=detail.get("location", "Diagram"),
        )
        for detail in details
    ]
    first = mapped_details[0] if mapped_details else None
    return EvaluationResult(
        overallScore=score,
        details=mapped_details,
        errorType=first.error_type if first else "GENERAL_HINT",
        evaDescription=first.eva_description if first else "",
        errorLocation=first.error_location if first else "Diagram",
        provider="MOCK",
        model="mock-rule-based",
    )
