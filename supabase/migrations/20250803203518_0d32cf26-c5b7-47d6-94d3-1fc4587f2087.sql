-- Get all policies that reference user_role enum
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE qual LIKE '%role%' OR with_check LIKE '%role%';