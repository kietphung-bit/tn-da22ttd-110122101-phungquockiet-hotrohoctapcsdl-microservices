import logging
import json

from config import settings
from models.evaluation_job import DeadLetterJob, EvaluationJobPayload
from utils.redis_client import get_redis_client

logger = logging.getLogger("ai-worker")


class EvaluationQueueClient:
    def __init__(self) -> None:
        self.client = get_redis_client()

    def pop_blocking(self) -> str | None:
        result = self.client.blpop(
            settings.evaluation_queue_name,
            timeout=settings.redis_block_timeout_seconds,
        )
        if result is None:
            return None
        _, raw_payload = result
        return raw_payload

    def pop_next(self) -> str | None:
        return self.client.lpop(settings.evaluation_queue_name)

    def requeue(self, payload: EvaluationJobPayload) -> None:
        self.client.rpush(
            settings.evaluation_queue_name,
            payload.model_dump_json(by_alias=True),
        )
        logger.info(
            "Requeued evaluation job jobId=%s submissionId=%s attempt=%s",
            payload.normalized_job_id(),
            payload.submission_id,
            payload.attempt,
        )

    def push_dead_letter(self, dead_letter: DeadLetterJob) -> None:
        self.client.rpush(
            settings.evaluation_dead_letter_queue_name,
            dead_letter.model_dump_json(by_alias=True),
        )
        logger.error(
            "Pushed evaluation job to dead-letter queue=%s jobId=%s submissionId=%s attempt=%s",
            settings.evaluation_dead_letter_queue_name,
            dead_letter.job.normalized_job_id(),
            dead_letter.job.submission_id,
            dead_letter.job.attempt,
        )

    def push_malformed_dead_letter(self, raw_payload: str, error: Exception) -> None:
        self.client.rpush(
            settings.evaluation_dead_letter_queue_name,
            json.dumps(
                {
                    "rawPayload": raw_payload,
                    "error": str(error),
                    "malformed": True,
                }
            ),
        )
        logger.error(
            "Pushed malformed evaluation job to dead-letter queue=%s error=%s",
            settings.evaluation_dead_letter_queue_name,
            str(error),
        )
