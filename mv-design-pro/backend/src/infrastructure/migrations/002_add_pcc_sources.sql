ALTER TABLE projects
    ADD COLUMN pcc_node_id UUID REFERENCES network_nodes(id);

ALTER TABLE projects
    ADD COLUMN sources_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb;
