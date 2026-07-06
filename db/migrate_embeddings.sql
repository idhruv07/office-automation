CREATE TABLE IF NOT EXISTS page_embeddings (
    page_id INT PRIMARY KEY REFERENCES document_pages(id) ON DELETE CASCADE,
    embedding real[],
    office_id INT REFERENCES offices(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION cosine_similarity(v1 real[], v2 real[])
RETURNS float AS $$
DECLARE
    dot_product float := 0;
    i int;
BEGIN
    FOR i IN 1..array_length(v1, 1) LOOP
        dot_product := dot_product + (v1[i] * v2[i]);
    END LOOP;
    RETURN dot_product;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;
