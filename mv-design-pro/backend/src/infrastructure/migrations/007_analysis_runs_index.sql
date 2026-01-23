CREATE TABLE analysis_runs_index (
    run_id VARCHAR(64) PRIMARY KEY,
    analysis_type VARCHAR(100) NOT NULL,
    case_id VARCHAR(64),
    base_snapshot_id VARCHAR(64),
    primary_artifact_type VARCHAR(100) NOT NULL,
    primary_artifact_id VARCHAR(64) NOT NULL,
    fingerprint VARCHAR(128) NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL,
    meta_json JSONB
);

CREATE INDEX ix_analysis_runs_index_analysis_type ON analysis_runs_index (analysis_type);
CREATE INDEX ix_analysis_runs_index_case_id ON analysis_runs_index (case_id);
CREATE INDEX ix_analysis_runs_index_base_snapshot_id ON analysis_runs_index (base_snapshot_id);
CREATE INDEX ix_analysis_runs_index_fingerprint ON analysis_runs_index (fingerprint);
CREATE INDEX ix_analysis_runs_index_created_at_utc ON analysis_runs_index (created_at_utc);
