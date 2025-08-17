-- Check if we can get company_id through client_id or other relationships
SELECT DISTINCT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'company_id'
ORDER BY table_name;