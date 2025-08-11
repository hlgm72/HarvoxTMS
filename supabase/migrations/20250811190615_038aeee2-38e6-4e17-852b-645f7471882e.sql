-- Agregar a Diosvani como conductor activo en HG Transport LLC
-- Solo agregar el rol ya que owner_operators es independiente del company

INSERT INTO user_company_roles (
  user_id,
  company_id,
  role,
  is_active,
  delegated_by,
  delegated_at
) VALUES (
  '484d83b3-b928-46b3-9705-db225ddb9b0c', -- Diosvani's user_id
  'e5d52767-ca59-4c28-94e4-058aff6a037b', -- HG Transport LLC company_id
  'driver',
  true,
  (SELECT user_id FROM user_company_roles WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' AND role = 'company_owner' AND is_active = true LIMIT 1),
  now()
);