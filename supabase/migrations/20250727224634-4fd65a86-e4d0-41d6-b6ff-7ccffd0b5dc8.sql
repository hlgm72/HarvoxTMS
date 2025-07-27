-- Alternative approach: Modify access to cron tables by removing anonymous role
-- Since we can't modify the policies directly, let's modify the role assignments

-- Check current role memberships
SELECT 
  r.rolname as role_name,
  r.rolcanlogin as can_login,
  r.rolinherit as inherits,
  ARRAY(
    SELECT b.rolname
    FROM pg_catalog.pg_auth_members m
    JOIN pg_catalog.pg_roles b ON (m.roleid = b.oid)
    WHERE m.member = r.oid
  ) as member_of
FROM pg_catalog.pg_roles r
WHERE r.rolname IN ('public', 'anon', 'authenticated')
ORDER BY 1;

-- Remove anon role from public to prevent anonymous access to cron tables
-- This should prevent anonymous users from being part of 'public' role
REVOKE public FROM anon;

-- Also ensure authenticated users have proper access
GRANT authenticated TO postgres;