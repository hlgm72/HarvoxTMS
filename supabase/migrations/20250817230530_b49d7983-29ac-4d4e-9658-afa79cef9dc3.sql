-- Add metadata column to load_documents table for storing photo categories and other document metadata
ALTER TABLE load_documents ADD COLUMN metadata jsonb;