ALTER TABLE analysis_runs
    ADD COLUMN result_status VARCHAR(20) NOT NULL DEFAULT 'VALID';

ALTER TABLE analysis_runs
    DROP CONSTRAINT IF EXISTS uq_analysis_runs_deterministic;
