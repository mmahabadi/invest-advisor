from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
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
