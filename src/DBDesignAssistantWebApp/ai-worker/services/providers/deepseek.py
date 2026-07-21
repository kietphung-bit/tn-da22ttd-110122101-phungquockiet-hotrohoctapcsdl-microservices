import json
import urllib.error
import urllib.request
from typing import Any

from config import settings
from models.evaluation_result import EvaluationResult
from services.evaluator import normalize_diagram_relationship_cardinalities
from services.prompt_loader import load_prompt_template
from services.providers.base import EvaluationProvider, EvaluationProviderError, ProviderConfigurationError
from services.providers.gemini import _parse_evaluation_json


class DeepSeekEvaluationProvider(EvaluationProvider):
    name = "DEEPSEEK"

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        if not settings.deepseek_api_key.strip():
            raise ProviderConfigurationError("DeepSeek API key is not configured")

        prompt = self._build_prompt(diagram_data or {}, context)
        response_json = self._call_deepseek(prompt)
        response_text = self._extract_text(response_json)
        result = _parse_evaluation_json(response_text)
        result.provider = self.name
        result.model = settings.deepseek_model.strip()
        return result

    def _build_prompt(self, diagram_data: dict[str, Any], context: dict[str, Any]) -> str:
        template = load_prompt_template("evaluation_hinting.md")
        normalized_diagram_data = normalize_diagram_relationship_cardinalities(diagram_data)
        return template.replace(
            "{{DIAGRAM_DATA_JSON}}",
            json.dumps(normalized_diagram_data, ensure_ascii=False, indent=2),
        ).replace(
            "{{EVALUATION_CONTEXT_JSON}}",
            json.dumps(context, ensure_ascii=False, indent=2),
        )

    def _call_deepseek(self, prompt: str) -> dict[str, Any]:
        url = f"{settings.deepseek_base_url.strip().rstrip('/')}/chat/completions"
        payload = {
            "model": settings.deepseek_model.strip(),
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "temperature": 0.2,
            "max_tokens": 2000,
            "response_format": {"type": "json_object"},
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.deepseek_api_key.strip()}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=settings.evaluation_provider_timeout_seconds,
            ) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as ex:
            raise EvaluationProviderError(f"DeepSeek HTTP error {ex.code}") from ex
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as ex:
            raise EvaluationProviderError(f"DeepSeek request failed: {ex}") from ex

    def _extract_text(self, response_json: dict[str, Any]) -> str:
        try:
            text = response_json["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as ex:
            raise EvaluationProviderError("DeepSeek response did not contain message content") from ex
        if not isinstance(text, str) or not text.strip():
            raise EvaluationProviderError("DeepSeek response text was empty")
        return text.strip()
