import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from config import settings
from models.evaluation_result import EvaluationResult
from services.prompt_loader import load_prompt_template
from services.providers.base import EvaluationProvider, EvaluationProviderError, ProviderConfigurationError

logger = logging.getLogger("ai-worker")


class GeminiEvaluationProvider(EvaluationProvider):
    name = "GEMINI"

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        if not settings.gemini_api_key.strip():
            raise ProviderConfigurationError("Gemini API key is not configured")

        prompt = self._build_prompt(diagram_data or {}, context)
        response_json = self._call_gemini(prompt)
        response_text = self._extract_text(response_json)
        result = _parse_evaluation_json(response_text)
        result.provider = self.name
        result.model = settings.gemini_model.strip()
        return result

    def _build_prompt(self, diagram_data: dict[str, Any], context: dict[str, Any]) -> str:
        template = load_prompt_template("evaluation_hinting.md")
        return template.replace("{{DIAGRAM_DATA_JSON}}", json.dumps(diagram_data, ensure_ascii=False, indent=2)).replace(
            "{{EVALUATION_CONTEXT_JSON}}",
            json.dumps(context, ensure_ascii=False, indent=2),
        )

    def _call_gemini(self, prompt: str) -> dict[str, Any]:
        model = urllib.parse.quote(settings.gemini_model.strip(), safe="")
        api_key = urllib.parse.quote(settings.gemini_api_key.strip(), safe="")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(
                request,
                timeout=settings.evaluation_provider_timeout_seconds,
            ) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as ex:
            body = ex.read().decode("utf-8", errors="replace")[:500]
            raise EvaluationProviderError(f"Gemini HTTP error {ex.code}: {body}") from ex
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as ex:
            raise EvaluationProviderError(f"Gemini request failed: {ex}") from ex

    def _extract_text(self, response_json: dict[str, Any]) -> str:
        try:
            parts = response_json["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as ex:
            raise EvaluationProviderError("Gemini response did not contain candidate text") from ex
        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        text = "\n".join(part for part in text_parts if part).strip()
        if not text:
            raise EvaluationProviderError("Gemini response text was empty")
        return text


def _parse_evaluation_json(response_text: str) -> EvaluationResult:
    raw_json = _extract_json_object(response_text)
    try:
        data = json.loads(raw_json)
        result = EvaluationResult.model_validate(data)
    except (json.JSONDecodeError, ValueError) as ex:
        raise EvaluationProviderError("Provider returned invalid evaluation JSON") from ex

    _guard_against_complete_solution(result)
    return result


def _extract_json_object(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise EvaluationProviderError("Provider response did not include a JSON object")
    return stripped[start : end + 1]


def _guard_against_complete_solution(result: EvaluationResult) -> None:
    joined = " ".join(
        [result.eva_description]
        + [detail.eva_description for detail in result.normalized_details()]
    ).lower()
    blocked_markers = [
        "create table",
        "alter table",
        "complete answer",
        "final schema",
        "dap an hoan chinh",
        "đáp án hoàn chỉnh",
    ]
    if any(marker in joined for marker in blocked_markers):
        logger.warning("Provider response looked too solution-like; rejecting provider output")
        raise EvaluationProviderError("Provider response included complete-solution markers")
