-- Update the constraint to include new document types
ALTER TABLE public.company_documents 
DROP CONSTRAINT IF EXISTS valid_document_type;

-- Add new constraint with expanded document types
ALTER TABLE public.company_documents 
ADD CONSTRAINT valid_document_type 
CHECK (document_type IN (
  -- Legal documents
  'incorporation', 'ein', 'business_license', 'operating_agreement',
  
  -- Insurance documents  
  'general_liability', 'auto_liability', 'cargo_insurance', 'workers_comp',
  
  -- Permits and licenses
  'dot_permit', 'mc_authority', 'interstate_permit', 'hazmat_permit',
  
  -- Financial documents
  'w9', 'bank_statements', 'factoring_agreement', 'credit_application',
  
  -- Contracts
  'broker_agreement', 'customer_contract', 'lease_agreement',
  
  -- Custom/other
  'custom', 'other'
));