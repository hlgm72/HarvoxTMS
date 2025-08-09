-- Eliminar todos los registros duplicados (activos e inactivos)
-- Mantener solo el más reciente de cada combinación

WITH all_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, company_id, role 
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM user_company_roles
)
DELETE FROM user_company_roles
WHERE id IN (
  SELECT id FROM all_duplicates WHERE rn > 1
);

-- Crear constraint única solo para registros activos usando partial index
CREATE UNIQUE INDEX unique_user_company_role_active_idx 
ON user_company_roles (user_id, company_id, role) 
WHERE is_active = true;