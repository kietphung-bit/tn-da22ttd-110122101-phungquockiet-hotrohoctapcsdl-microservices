from functools import lru_cache
from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


@lru_cache(maxsize=8)
def load_prompt_template(prompt_name: str) -> str:
    prompt_path = PROMPT_DIR / prompt_name
    return prompt_path.read_text(encoding="utf-8")
