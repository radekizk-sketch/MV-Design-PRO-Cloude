CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    case_id UUID REFERENCES operating_cases(id),
    analysis_type VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    input_snapshot_jsonb JSONB NOT NULL,
    input_hash VARCHAR(128) NOT NULL,
    result_summary_jsonb JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
);

CREATE INDEX idx_analysis_runs_project_id ON analysis_runs(project_id);
CREATE INDEX idx_analysis_runs_type_status ON analysis_runs(analysis_type, status);
CREATE INDEX idx_analysis_runs_created_at ON analysis_runs(created_at);
