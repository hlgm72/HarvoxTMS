-- Eliminar registros duplicados en user_company_roles
-- Mantener solo el registro más reciente por user_id, company_id, role

WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, company_id, role 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM user_company_roles
  WHERE is_active = true
)
DELETE FROM user_company_roles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Mostrar los registros que quedaron después de la limpieza
SELECT 
  ucr.user_id, 
  ucr.company_id, 
  ucr.role, 
  ucr.created_at,
  au.email
FROM user_company_roles ucr
LEFT JOIN auth.users au ON ucr.user_id = au.id
WHERE ucr.is_active = true
ORDER BY ucr.created_at DESC;