import logging
from datetime import datetime, timezone
from typing import Any

from config import settings
from database import load_submission, mark_submission_failed, persist_evaluation
from models.evaluation_job import DeadLetterJob, EvaluationJobPayload
from services.evaluation_service import EvaluationService
from utils.evaluation_queue import EvaluationQueueClient

logger = logging.getLogger("ai-worker")


class EvaluationJobProcessor:
    def __init__(
        self,
        queue_client: EvaluationQueueClient | None = None,
        evaluation_service: EvaluationService | None = None,
    ) -> None:
        self.queue_client = queue_client or EvaluationQueueClient()
        self.evaluation_service = evaluation_service or EvaluationService()

    def process(self, payload: EvaluationJobPayload) -> dict[str, Any]:
        logger.info(
            "Evaluation job received jobId=%s submissionId=%s attempt=%s idempotencyKey=%s",
            payload.normalized_job_id(),
            payload.submission_id,
            payload.attempt,
            payload.normalized_idempotency_key(),
        )
        submission = load_submission(payload.submission_id)
        diagram_data = payload.diagram_data or submission["diagram_data"]
        result = self.evaluation_service.evaluate(
            diagram_data,
            {
                "jobId": payload.normalized_job_id(),
                "submissionId": payload.submission_id,
                "roundId": payload.round_id,
                "roundNumber": payload.round_number,
                "exerciseId": payload.exercise_id or submission.get("exercise_id"),
                "userId": payload.user_id or submission.get("user_id"),
                "attempt": payload.attempt,
            },
        )
        details = result.to_persistence_details()
        evaluation_id = persist_evaluation(
            payload.submission_id,
            result.overall_score,
            details,
            round_id=payload.round_id,
            round_number=payload.round_number,
            provider=result.provider,
            model=result.model,
            fallback_used=result.fallback_used,
            fallback_from=result.fallback_from,
        )
        logger.info(
            "Evaluation job success jobId=%s submissionId=%s evaluationId=%s provider=%s model=%s fallback=%s fallbackFrom=%s detailCount=%s",
            payload.normalized_job_id(),
            payload.submission_id,
            evaluation_id,
            result.provider,
            result.model,
            result.fallback_used,
            result.fallback_from,
            len(details),
        )
        return {
            "submissionId": payload.submission_id,
            "roundId": payload.round_id,
            "roundNumber": payload.round_number,
            "evaluationId": evaluation_id,
            "overallScore": result.overall_score,
            "detailCount": len(details),
            "attempt": payload.attempt,
            "provider": result.provider,
            "model": result.model,
            "fallbackUsed": result.fallback_used,
            "fallbackFrom": result.fallback_from,
        }

    def process_raw(self, raw_payload: str) -> dict[str, Any]:
        payload = EvaluationJobPayload.model_validate_json(raw_payload)
        return self.process(payload)

    def handle_failure(self, payload: EvaluationJobPayload, error: Exception) -> dict[str, Any]:
        next_attempt = payload.attempt + 1
        if next_attempt <= settings.evaluation_max_retries:
            retry_payload = payload.model_copy(update={"attempt": next_attempt})
            logger.warning(
                "Evaluation job failed; retrying jobId=%s submissionId=%s attempt=%s/%s error=%s",
                retry_payload.normalized_job_id(),
                retry_payload.submission_id,
                retry_payload.attempt,
                settings.evaluation_max_retries,
                str(error),
            )
            self.queue_client.requeue(retry_payload)
            return {
                "processed": False,
                "retried": True,
                "deadLettered": False,
                "submissionId": payload.submission_id,
                "attempt": retry_payload.attempt,
            }

        dead_letter = DeadLetterJob(
            job=payload,
            error=str(error),
            failedAt=datetime.now(timezone.utc).isoformat(),
        )
        self.queue_client.push_dead_letter(dead_letter)
        try:
            mark_submission_failed(payload.submission_id, payload.round_id, payload.round_number)
        except Exception:
            logger.exception(
                "Could not mark submission FAILED after dead-letter submissionId=%s",
                payload.submission_id,
            )
        return {
            "processed": False,
            "retried": False,
            "deadLettered": True,
            "submissionId": payload.submission_id,
            "attempt": payload.attempt,
        }
