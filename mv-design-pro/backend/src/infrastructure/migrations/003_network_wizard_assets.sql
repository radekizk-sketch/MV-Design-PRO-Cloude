CREATE TABLE project_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id),
    connection_node_id UUID REFERENCES network_nodes(id),
    grounding_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
    limits_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE network_sources (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    node_id UUID NOT NULL REFERENCES network_nodes(id),
    source_type VARCHAR(100) NOT NULL,
    payload_jsonb JSONB NOT NULL,
    in_service BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE network_loads (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id),
    node_id UUID NOT NULL REFERENCES network_nodes(id),
    payload_jsonb JSONB NOT NULL,
    in_service BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE line_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    params_jsonb JSONB NOT NULL
);

CREATE TABLE cable_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    params_jsonb JSONB NOT NULL
);

CREATE TABLE transformer_types (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    params_jsonb JSONB NOT NULL
);

CREATE TABLE network_switching_states (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES operating_cases(id),
    element_id UUID NOT NULL,
    element_type VARCHAR(50) NOT NULL,
    in_service BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_network_sources_project ON network_sources(project_id);
CREATE INDEX idx_network_sources_node ON network_sources(node_id);
CREATE INDEX idx_network_loads_project ON network_loads(project_id);
CREATE INDEX idx_network_loads_node ON network_loads(node_id);
CREATE INDEX idx_switching_case ON network_switching_states(case_id);
CREATE INDEX idx_switching_element ON network_switching_states(element_id);
