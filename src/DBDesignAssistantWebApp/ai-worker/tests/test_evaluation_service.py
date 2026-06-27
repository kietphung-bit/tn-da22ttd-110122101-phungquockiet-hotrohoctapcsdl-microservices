import sys
import unittest
from pathlib import Path
from typing import Any


AI_WORKER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_WORKER_ROOT))

from config import settings
from models.evaluation_result import EvaluationResult
from services.evaluation_service import EvaluationService
from services.providers.base import EvaluationProvider, EvaluationProviderError
from services.providers.gemini import GeminiEvaluationProvider, _parse_evaluation_json
from services.providers.mock import MockEvaluationProvider


class ErrorProvider(EvaluationProvider):
    name = "ERROR_PROVIDER"

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        raise EvaluationProviderError("forced provider error")


class SuccessProvider(EvaluationProvider):
    name = "SUCCESS_PROVIDER"

    def evaluate(self, diagram_data: dict[str, Any] | None, context: dict[str, Any]) -> EvaluationResult:
        return EvaluationResult(
            overallScore=88,
            details=[
                {
                    "errorType": "CARDINALITY_HINT",
                    "evaDescription": "Kiem tra lai cardinality cua relationship nay.",
                    "errorLocation": "Relationship: borrows",
                }
            ],
            errorType="SUMMARY",
            evaDescription="Co mot diem can tu kiem tra.",
            errorLocation="Diagram",
            provider=self.name,
        )


class EvaluationServiceTests(unittest.TestCase):
    def test_provider_error_falls_back_to_mock(self) -> None:
        service = EvaluationService(
            primary_provider=ErrorProvider(),
            fallback_provider=MockEvaluationProvider(),
        )

        result = service.evaluate({"entities": [], "relationships": []}, {})

        self.assertEqual(result.provider, "MOCK")
        self.assertTrue(result.fallback_used)
        self.assertEqual(result.fallback_from, "ERROR_PROVIDER")
        self.assertGreaterEqual(len(result.normalized_details()), 1)

    def test_success_provider_result_is_used(self) -> None:
        service = EvaluationService(
            primary_provider=SuccessProvider(),
            fallback_provider=MockEvaluationProvider(),
        )

        result = service.evaluate({"entities": [], "relationships": []}, {})

        self.assertEqual(result.provider, "SUCCESS_PROVIDER")
        self.assertFalse(result.fallback_used)
        self.assertEqual(result.overall_score, 88)

    def test_gemini_missing_key_falls_back_to_mock(self) -> None:
        original_key = settings.gemini_api_key
        settings.gemini_api_key = ""
        try:
            service = EvaluationService(
                primary_provider=GeminiEvaluationProvider(),
                fallback_provider=MockEvaluationProvider(),
            )
            result = service.evaluate({"entities": [], "relationships": []}, {})
        finally:
            settings.gemini_api_key = original_key

        self.assertEqual(result.provider, "MOCK")
        self.assertTrue(result.fallback_used)
        self.assertEqual(result.fallback_from, "GEMINI")

    def test_provider_json_parse_success(self) -> None:
        result = _parse_evaluation_json(
            """
            {
              "overallScore": 91,
              "details": [
                {
                  "errorType": "NORMALIZATION_2NF_HINT",
                  "evaDescription": "Kiem tra xem attribute co phu thuoc tron ven vao khoa chinh khong.",
                  "errorLocation": "Entity: Enrollment"
                }
              ],
              "errorType": "SUMMARY",
              "evaDescription": "Diagram kha tot, can tu kiem tra chuan hoa.",
              "errorLocation": "Diagram"
            }
            """
        )

        self.assertEqual(result.overall_score, 91)
        self.assertEqual(result.normalized_details()[0].error_type, "NORMALIZATION_2NF_HINT")

    def test_provider_json_rejects_complete_solution_markers(self) -> None:
        with self.assertRaises(EvaluationProviderError):
            _parse_evaluation_json(
                """
                {
                  "overallScore": 100,
                  "details": [
                    {
                      "errorType": "GENERAL_HINT",
                      "evaDescription": "CREATE TABLE students (id int primary key);",
                      "errorLocation": "Diagram"
                    }
                  ],
                  "errorType": "SUMMARY",
                  "evaDescription": "final schema",
                  "errorLocation": "Diagram"
                }
                """
            )


if __name__ == "__main__":
    unittest.main()
