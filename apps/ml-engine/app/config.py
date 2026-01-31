from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # API - PORT is set by Railway
    API_HOST: str = "0.0.0.0"
    API_PORT: int = int(os.environ.get("PORT", 8000))
    DEBUG: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL_MINUTES: int = 60
    
    # Analysis settings
    PREDICTION_HORIZONS: list = [7, 30, 90]  # days
    MIN_CONFIDENCE_THRESHOLD: int = 50
    
    # Model paths
    MODELS_DIR: str = "models"
    
    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
