"""App settings, read from the environment."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Default targets the compose "db" service; hosting platforms override it.
    database_url: str = "postgresql+psycopg2://postgres:postgres@db:5432/inventory"

    cors_origins: str = "*"

    low_stock_threshold: int = 10

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
