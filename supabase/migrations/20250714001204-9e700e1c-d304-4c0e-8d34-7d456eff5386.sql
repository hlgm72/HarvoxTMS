-- Add is_active column to company_documents table for soft delete functionality
ALTER TABLE public.company_documents 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index for better performance on active documents queries
CREATE INDEX idx_company_documents_active ON public.company_documents(company_id, document_type, is_active) 
WHERE is_active = true;