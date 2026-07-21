from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres@localhost:5432/tempdb"
    redis_host: str = "localhost"
    redis_port: int = 6379
    evaluation_queue_name: str = "evaluation:jobs"
    evaluation_dead_letter_queue_name: str = "evaluation:jobs:dead-letter"
    evaluation_max_retries: int = 3
    redis_worker_enabled: bool = True
    redis_block_timeout_seconds: int = 5
    evaluation_provider: str = "MOCK"
    evaluation_provider_timeout_seconds: int = 30
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-v4-flash"

    class Config:
        env_prefix = "AI_WORKER_"


settings = Settings()
