from typing import Any

from pydantic import BaseModel, Field


class EvaluationJobPayload(BaseModel):
    job_id: str | None = Field(default=None, alias="jobId")
    idempotency_key: str | None = Field(default=None, alias="idempotencyKey")
    submission_id: int = Field(alias="submissionId")
    round_id: int | None = Field(default=None, alias="roundId")
    round_number: int | None = Field(default=None, alias="roundNumber")
    user_id: int | None = Field(default=None, alias="userId")
    exercise_id: int | None = Field(default=None, alias="exerciseId")
    diagram_data: dict[str, Any] | None = Field(default=None, alias="diagramData")
    queued_at: str | None = Field(default=None, alias="queuedAt")
    attempt: int = 0

    class Config:
        populate_by_name = True

    def normalized_job_id(self) -> str:
        if self.round_number is not None:
            return self.job_id or f"submission-{self.submission_id}-round-{self.round_number}"
        return self.job_id or f"submission-{self.submission_id}"

    def normalized_idempotency_key(self) -> str:
        if self.round_number is not None:
            return self.idempotency_key or f"{self.submission_id}:{self.round_number}"
        return self.idempotency_key or str(self.submission_id)


class DeadLetterJob(BaseModel):
    job: EvaluationJobPayload
    error: str
    failed_at: str = Field(alias="failedAt")

    class Config:
        populate_by_name = True
