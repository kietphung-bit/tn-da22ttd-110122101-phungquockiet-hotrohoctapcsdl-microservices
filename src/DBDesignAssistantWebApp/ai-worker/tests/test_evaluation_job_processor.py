import sys
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch


AI_WORKER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_WORKER_ROOT))

from config import settings
from models.evaluation_job import EvaluationJobPayload
from models.evaluation_result import EvaluationResult
from services.job_processor import EvaluationJobProcessor


class FakeQueueClient:
    def __init__(self) -> None:
        self.requeued: list[EvaluationJobPayload] = []
        self.dead_letters: list[Any] = []

    def requeue(self, payload: EvaluationJobPayload) -> None:
        self.requeued.append(payload)

    def push_dead_letter(self, dead_letter: Any) -> None:
        self.dead_letters.append(dead_letter)


class FakeEvaluationService:
    def evaluate(self, diagram_data: dict[str, Any], context: dict[str, Any]) -> EvaluationResult:
        return EvaluationResult(
            overallScore=76,
            details=[
                {
                    "errorType": "ROUND_AWARE_HINT",
                    "evaDescription": f"Round {context.get('roundNumber')} hint.",
                    "errorLocation": "Diagram",
                }
            ],
            errorType="SUMMARY",
            evaDescription="Summary.",
            errorLocation="Diagram",
            provider="MOCK",
            model="mock-rule-based",
            fallbackUsed=False,
        )


class EvaluationJobProcessorTests(unittest.TestCase):
    def test_round_payload_is_persisted_with_round_metadata(self) -> None:
        queue = FakeQueueClient()
        processor = EvaluationJobProcessor(
            queue_client=queue,
            evaluation_service=FakeEvaluationService(),
        )
        payload = EvaluationJobPayload(
            submissionId=42,
            roundId=7,
            roundNumber=2,
            userId=3,
            exerciseId=5,
            diagramData={"entities": [], "relationships": []},
            attempt=0,
        )

        with patch("services.job_processor.load_submission") as load_submission_mock, \
                patch("services.job_processor.persist_evaluation", return_value=99) as persist_mock:
            load_submission_mock.return_value = {
                "submission_id": 42,
                "user_id": 3,
                "exercise_id": 5,
                "diagram_data": {},
            }

            result = processor.process(payload)

        self.assertEqual(result["evaluationId"], 99)
        self.assertEqual(result["roundId"], 7)
        self.assertEqual(result["roundNumber"], 2)
        self.assertEqual(payload.normalized_idempotency_key(), "42:2")
        persist_mock.assert_called_once()
        _, _, details = persist_mock.call_args.args
        self.assertEqual(details[0]["error_type"], "ROUND_AWARE_HINT")
        self.assertEqual(persist_mock.call_args.kwargs["round_id"], 7)
        self.assertEqual(persist_mock.call_args.kwargs["round_number"], 2)
        self.assertEqual(persist_mock.call_args.kwargs["provider"], "MOCK")

    def test_handle_failure_requeues_until_max_retry(self) -> None:
        original_max_retries = settings.evaluation_max_retries
        settings.evaluation_max_retries = 2
        try:
            queue = FakeQueueClient()
            processor = EvaluationJobProcessor(queue_client=queue)
            payload = EvaluationJobPayload(submissionId=42, roundNumber=2, attempt=1)

            result = processor.handle_failure(payload, RuntimeError("temporary DB failure"))
        finally:
            settings.evaluation_max_retries = original_max_retries

        self.assertTrue(result["retried"])
        self.assertFalse(result["deadLettered"])
        self.assertEqual(queue.requeued[0].attempt, 2)
        self.assertEqual(queue.requeued[0].normalized_idempotency_key(), "42:2")

    def test_handle_failure_dead_letters_and_marks_round_failed_after_max_retry(self) -> None:
        original_max_retries = settings.evaluation_max_retries
        settings.evaluation_max_retries = 1
        try:
            queue = FakeQueueClient()
            processor = EvaluationJobProcessor(queue_client=queue)
            payload = EvaluationJobPayload(submissionId=42, roundId=7, roundNumber=2, attempt=1)

            with patch("services.job_processor.mark_submission_failed") as mark_failed_mock:
                result = processor.handle_failure(payload, RuntimeError("permanent DB failure"))
        finally:
            settings.evaluation_max_retries = original_max_retries

        self.assertTrue(result["deadLettered"])
        self.assertFalse(result["retried"])
        self.assertEqual(len(queue.dead_letters), 1)
        self.assertEqual(queue.dead_letters[0].job.normalized_idempotency_key(), "42:2")
        mark_failed_mock.assert_called_once_with(42, 7, 2)


if __name__ == "__main__":
    unittest.main()
