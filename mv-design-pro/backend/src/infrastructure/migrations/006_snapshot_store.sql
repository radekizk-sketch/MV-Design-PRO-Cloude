CREATE TABLE network_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    parent_snapshot_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL,
    schema_version VARCHAR(50),
    snapshot_json JSONB NOT NULL
);
