from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import analysis, health
from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 ML Engine starting up...")
    yield
    # Shutdown
    print("👋 ML Engine shutting down...")


app = FastAPI(
    title="InvestAdvisor ML Engine",
    description="Machine Learning service for investment analysis and predictions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(analysis.router, prefix="/analyze", tags=["Analysis"])


@app.get("/")
async def root():
    return {
        "name": "InvestAdvisor ML Engine",
        "version": "1.0.0",
        "status": "running",
    }
