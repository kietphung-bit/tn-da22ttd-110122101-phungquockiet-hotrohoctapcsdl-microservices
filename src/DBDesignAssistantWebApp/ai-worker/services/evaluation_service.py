import logging
import re
from typing import Any

from config import settings
from models.evaluation_result import EvaluationResult
from services.providers.base import EvaluationProvider, EvaluationProviderError
from services.providers.deepseek import DeepSeekEvaluationProvider
from services.providers.gemini import GeminiEvaluationProvider
from services.providers.mock import MockEvaluationProvider

logger = logging.getLogger("ai-worker")


class EvaluationService:
    def __init__(
        self,
        primary_provider: EvaluationProvider | None = None,
        fallback_provider: EvaluationProvider | None = None,
    ) -> None:
        self.primary_provider = primary_provider or _build_provider(settings.evaluation_provider)
        self.fallback_provider = fallback_provider or MockEvaluationProvider()

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        if self.primary_provider.name == self.fallback_provider.name:
            return self.fallback_provider.evaluate(diagram_data, context)

        try:
            return self.primary_provider.evaluate(diagram_data, context)
        except EvaluationProviderError as ex:
            logger.warning(
                "Evaluation provider failed; falling back primaryProvider=%s fallbackProvider=%s reason=%s",
                self.primary_provider.name,
                self.fallback_provider.name,
                _safe_reason(ex),
            )
        except Exception as ex:
            logger.warning(
                "Evaluation provider crashed; falling back primaryProvider=%s fallbackProvider=%s reason=%s",
                self.primary_provider.name,
                self.fallback_provider.name,
                _safe_reason(ex),
            )

        result = self.fallback_provider.evaluate(diagram_data, context)
        result.fallback_used = True
        result.fallback_from = self.primary_provider.name
        return result


def _build_provider(provider_name: str) -> EvaluationProvider:
    normalized = (provider_name or "MOCK").strip().upper()
    if normalized == "GEMINI":
        return GeminiEvaluationProvider()
    if normalized == "DEEPSEEK":
        return DeepSeekEvaluationProvider()
    if normalized != "MOCK":
        logger.warning("Unknown evaluation provider=%s; using MOCK", normalized)
    return MockEvaluationProvider()


def _safe_reason(error: Exception) -> str:
    reason = f"{error.__class__.__name__}: {str(error)}"
    for key in [settings.gemini_api_key.strip(), settings.deepseek_api_key.strip()]:
        if key:
            reason = reason.replace(key, "[redacted]")
    reason = re.sub(r"(?i)(key|api[_-]?key)=([^&\s]+)", r"\1=[redacted]", reason)
    reason = re.sub(r"\s+", " ", reason).strip()
    return reason[:240]
