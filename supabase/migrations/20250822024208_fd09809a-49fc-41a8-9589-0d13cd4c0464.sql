-- Add issue_date column to company_documents table
ALTER TABLE public.company_documents 
ADD COLUMN issue_date DATE;