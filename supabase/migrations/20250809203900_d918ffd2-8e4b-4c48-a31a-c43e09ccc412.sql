-- Limpiar registros duplicados en user_company_roles
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

-- Agregar constraint único para prevenir duplicados futuros
ALTER TABLE user_company_roles 
ADD CONSTRAINT unique_user_company_role_active 
UNIQUE (user_id, company_id, role) 
DEFERRABLE INITIALLY DEFERRED;