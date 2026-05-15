from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "IP引擎"
    debug: bool = False
    frontend_url: str = "http://localhost:5173"

    # Database（SQLite for dev，PostgreSQL for prod）
    database_url: str = "sqlite+aiosqlite:///./ip_engine.db"

    # Auth
    jwt_secret: str = "change-me-in-production-use-256bit-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # AI — DeepSeek（主）/ 通义千问（备）
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    qwen_api_key: Optional[str] = None
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen-turbo"

    # 没有 API key 时返回 mock 数据（开发用）
    ai_mock_mode: bool = False

    # Cost control
    free_monthly_generation_limit: int = 10
    basic_monthly_generation_limit: int = 200


settings = Settings()
