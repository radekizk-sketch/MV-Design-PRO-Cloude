CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE network_nodes (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    base_kv DOUBLE PRECISION NOT NULL,
    attrs_jsonb JSONB NOT NULL
);

CREATE TABLE network_branches (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    branch_type VARCHAR(100) NOT NULL,
    from_node_id UUID NOT NULL REFERENCES network_nodes(id),
    to_node_id UUID NOT NULL REFERENCES network_nodes(id),
    in_service BOOLEAN NOT NULL DEFAULT TRUE,
    params_jsonb JSONB NOT NULL
);

CREATE TABLE operating_cases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    case_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE study_cases (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    study_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE scenarios (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    metadata_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE study_runs (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    case_id UUID NOT NULL REFERENCES study_cases(id),
    analysis_type VARCHAR(100) NOT NULL,
    input_hash VARCHAR(128) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ
);

CREATE TABLE study_results (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES study_runs(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    result_type VARCHAR(100) NOT NULL,
    result_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sld_diagrams (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    sld_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
