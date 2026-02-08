ALTER TABLE sld_diagrams
    ADD COLUMN dirty_flag BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE sld_node_symbols (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    node_id UUID NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    label VARCHAR(255),
    is_connection_node BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE sld_branch_symbols (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    branch_id UUID NOT NULL,
    from_node_id UUID NOT NULL,
    to_node_id UUID NOT NULL,
    points_jsonb JSONB NOT NULL
);

CREATE TABLE sld_annotations (
    id UUID PRIMARY KEY,
    diagram_id UUID NOT NULL REFERENCES sld_diagrams(id),
    text TEXT NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL
);
