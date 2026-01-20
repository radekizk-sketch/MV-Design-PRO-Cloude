CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    operating_case_id UUID NOT NULL REFERENCES operating_cases(id),
    analysis_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    input_snapshot JSONB NOT NULL,
    input_hash VARCHAR(128) NOT NULL,
    result_summary JSONB NOT NULL,
    error_message TEXT,
    CONSTRAINT uq_analysis_runs_deterministic UNIQUE (
        project_id,
        operating_case_id,
        analysis_type,
        input_hash
    )
);

CREATE INDEX ix_analysis_runs_input_hash ON analysis_runs (input_hash);
