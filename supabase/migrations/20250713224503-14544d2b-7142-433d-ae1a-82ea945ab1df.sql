-- Add missing notes field to company_documents table
ALTER TABLE public.company_documents 
ADD COLUMN IF NOT EXISTS notes TEXT;