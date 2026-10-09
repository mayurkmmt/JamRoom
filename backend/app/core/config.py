import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DB_ENGINE: str = os.getenv("DB_ENGINE", "django.db.backends.postgresql")
    DB_NAME: str = os.getenv("DB_NAME", "db_jamroom")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "root")
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
