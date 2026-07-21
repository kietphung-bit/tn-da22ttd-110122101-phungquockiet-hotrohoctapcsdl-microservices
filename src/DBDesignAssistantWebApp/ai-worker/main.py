import logging
import threading
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException

from config import settings
from models.evaluation_job import EvaluationJobPayload
from services.job_processor import EvaluationJobProcessor
from utils.evaluation_queue import EvaluationQueueClient

logger = logging.getLogger("ai-worker")
logging.basicConfig(level=logging.INFO)

stop_event = threading.Event()
queue_client = EvaluationQueueClient()
job_processor = EvaluationJobProcessor(queue_client)


def process_evaluation_job(payload: EvaluationJobPayload) -> dict[str, Any]:
    return job_processor.process(payload)


def redis_worker_loop() -> None:
    logger.info("Redis evaluation worker listening on queue %s", settings.evaluation_queue_name)
    while not stop_event.is_set():
        raw_payload = None
        try:
            raw_payload = queue_client.pop_blocking()
            if raw_payload is None:
                continue
            payload = EvaluationJobPayload.model_validate_json(raw_payload)
            job_processor.process(payload)
        except Exception as ex:
            logger.exception("Failed to process evaluation job")
            if raw_payload is not None:
                try:
                    payload = EvaluationJobPayload.model_validate_json(raw_payload)
                    job_processor.handle_failure(payload, ex)
                except Exception as malformed_ex:
                    queue_client.push_malformed_dead_letter(raw_payload, malformed_ex)
                    logger.exception("Could not retry/dead-letter malformed evaluation job")


@asynccontextmanager
async def lifespan(_: FastAPI):
    worker_thread = None
    if settings.redis_worker_enabled:
        worker_thread = threading.Thread(target=redis_worker_loop, daemon=True)
        worker_thread.start()
    yield
    stop_event.set()
    if worker_thread is not None:
        worker_thread.join(timeout=2)


app = FastAPI(title="DB Design AI Worker", lifespan=lifespan)


@app.get("/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "queue": settings.evaluation_queue_name,
        "deadLetterQueue": settings.evaluation_dead_letter_queue_name,
        "maxRetries": settings.evaluation_max_retries,
        "redisWorkerEnabled": settings.redis_worker_enabled,
        "evaluationProvider": settings.evaluation_provider,
        "geminiModel": settings.gemini_model,
        "deepseekModel": settings.deepseek_model,
    }


@app.post("/internal/evaluation/process")
def process_evaluation(payload: EvaluationJobPayload) -> dict[str, Any]:
    try:
        return process_evaluation_job(payload)
    except ValueError as ex:
        raise HTTPException(status_code=404, detail=str(ex)) from ex
    except Exception as ex:
        raise HTTPException(status_code=500, detail="Evaluation worker failed") from ex


@app.post("/internal/evaluation/process-next")
def process_next_job() -> dict[str, Any]:
    raw_payload = queue_client.pop_next()
    if raw_payload is None:
        return {"processed": False, "message": "No pending evaluation job"}
    try:
        payload = EvaluationJobPayload.model_validate_json(raw_payload)
        processed = process_evaluation_job(payload)
        return {"processed": True, **processed}
    except Exception as ex:
        logger.exception("Failed to process next evaluation job")
        try:
            payload = EvaluationJobPayload.model_validate_json(raw_payload)
            return job_processor.handle_failure(payload, ex)
        except Exception as malformed_ex:
            queue_client.push_malformed_dead_letter(raw_payload, malformed_ex)
            raise HTTPException(status_code=400, detail="Malformed evaluation job payload") from malformed_ex
