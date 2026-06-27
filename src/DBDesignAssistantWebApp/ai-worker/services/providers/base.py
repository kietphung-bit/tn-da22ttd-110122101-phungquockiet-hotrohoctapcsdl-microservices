from abc import ABC, abstractmethod
from typing import Any

from models.evaluation_result import EvaluationResult


class EvaluationProviderError(Exception):
    pass


class ProviderConfigurationError(EvaluationProviderError):
    pass


class EvaluationProvider(ABC):
    name: str

    @abstractmethod
    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        pass
