-- Check the current function to see the SQL issue
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'create_or_update_load_document_with_validation';