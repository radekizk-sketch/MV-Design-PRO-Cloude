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

CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    case_id UUID,
    analysis_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    input_snapshot_jsonb JSONB NOT NULL,
    result_summary_jsonb JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_analysis_runs_project_id ON analysis_runs(project_id);
CREATE INDEX ix_analysis_runs_type_status ON analysis_runs(analysis_type, status);
CREATE INDEX ix_analysis_runs_created_at ON analysis_runs(created_at);

CREATE TABLE sld_diagrams (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    layout_meta_jsonb JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_sld_diagrams_project_id ON sld_diagrams(project_id);

CREATE TABLE sld_node_symbols (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    network_node_id UUID NOT NULL,
    symbol_type VARCHAR(100) NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    rotation DOUBLE PRECISION NOT NULL,
    style_jsonb JSONB NOT NULL
);

CREATE INDEX ix_sld_node_symbols_diagram_id ON sld_node_symbols(diagram_id);
CREATE INDEX ix_sld_node_symbols_network_node_id ON sld_node_symbols(network_node_id);

CREATE TABLE sld_branch_symbols (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    network_branch_id UUID NOT NULL,
    from_symbol_id UUID NOT NULL REFERENCES sld_node_symbols(id),
    to_symbol_id UUID NOT NULL REFERENCES sld_node_symbols(id),
    routing_jsonb JSONB NOT NULL,
    style_jsonb JSONB NOT NULL
);

CREATE INDEX ix_sld_branch_symbols_diagram_id ON sld_branch_symbols(diagram_id);
CREATE INDEX ix_sld_branch_symbols_network_branch_id ON sld_branch_symbols(network_branch_id);

CREATE TABLE sld_annotations (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    text VARCHAR(500) NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    style_jsonb JSONB NOT NULL
);

CREATE INDEX ix_sld_annotations_diagram_id ON sld_annotations(diagram_id);
