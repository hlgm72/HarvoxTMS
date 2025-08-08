-- Search for any function using total_income in subqueries or joins
-- Let me check the create_or_update_load_with_validation function itself

-- Check if there's an issue in create_or_update_load_with_validation
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%create_or_update_load%';