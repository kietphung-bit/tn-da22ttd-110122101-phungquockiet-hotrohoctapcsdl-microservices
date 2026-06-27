from typing import Any

from models.evaluation_result import EvaluationResult, result_from_mock
from services.evaluator import evaluate_diagram
from services.providers.base import EvaluationProvider


class MockEvaluationProvider(EvaluationProvider):
    name = "MOCK"

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        score, details = evaluate_diagram(diagram_data)
        return result_from_mock(score, details)
