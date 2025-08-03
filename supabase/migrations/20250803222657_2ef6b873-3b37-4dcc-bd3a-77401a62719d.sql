-- Update senior_dispatcher to dispatcher since we're consolidating
UPDATE user_company_roles SET role = 'dispatcher' WHERE role = 'senior_dispatcher';

-- Verify only our 6 roles remain
SELECT DISTINCT role FROM user_company_roles;