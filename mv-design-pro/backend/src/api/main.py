"""Main FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.analysis_runs import router as analysis_runs_router
from api.analysis_runs_index import router as analysis_runs_index_router
from api.analysis_runs_read import router as analysis_runs_read_router
from api.cases import router as cases_router
from api.catalog import router as catalog_router
from api.comparison import router as comparison_router  # P10b
from api.design_synth import router as design_synth_router
from api.equipment_proof_pack import router as equipment_proof_pack_router
from api.issues import router as issues_router  # P30d
from api.power_flow_comparisons import router as power_flow_comparisons_router  # P20c
from api.power_flow_runs import router as power_flow_runs_router  # P20a
from api.project_archive import router as project_archive_router  # P31
from api.proof_pack import router as proof_pack_router
from api.protection_comparisons import router as protection_comparisons_router  # P15b
from api.protection_runs import router as protection_runs_router  # P15a
from api.sld import router as sld_router  # P11a
from api.snapshots import router as snapshots_router
from api.study_cases import router as study_cases_router

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
app.include_router(analysis_runs_index_router)
app.include_router(analysis_runs_read_router)
app.include_router(cases_router)
app.include_router(catalog_router)
app.include_router(comparison_router)  # P10b
app.include_router(design_synth_router)
app.include_router(equipment_proof_pack_router)
app.include_router(issues_router)  # P30d
app.include_router(power_flow_comparisons_router)  # P20c
app.include_router(power_flow_runs_router)  # P20a
app.include_router(project_archive_router)  # P31
app.include_router(proof_pack_router)
app.include_router(protection_comparisons_router)  # P15b
app.include_router(protection_runs_router)  # P15a
app.include_router(sld_router)  # P11a
app.include_router(snapshots_router)
app.include_router(study_cases_router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "MV-DESIGN PRO API", "version": "0.1.0"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
