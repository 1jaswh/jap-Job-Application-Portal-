-- ai_parsed_data: stores structured data extracted from CVs by the AI parser
CREATE TABLE IF NOT EXISTS ai_parsed_data (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT REFERENCES documents(id) ON DELETE SET NULL,
    application_id BIGINT REFERENCES applications(id) ON DELETE CASCADE,
    parsed_json JSONB,
    skills TEXT[],
    experience_years INTEGER,
    education_level VARCHAR(100),
    extracted_text TEXT,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_parsed_data_document_id ON ai_parsed_data(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_parsed_data_application_id ON ai_parsed_data(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_parsed_data_confidence_score ON ai_parsed_data(confidence_score);
