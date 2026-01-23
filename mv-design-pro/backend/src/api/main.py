"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.analysis_runs import router as analysis_runs_router
from api.cases import router as cases_router
from api.snapshots import router as snapshots_router

app = FastAPI(
    title="MV-DESIGN PRO API",
    description="Professional Medium Voltage Network Design System API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_runs_router)
app.include_router(cases_router)
app.include_router(snapshots_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "MV-DESIGN PRO API", "version": "0.1.0"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
