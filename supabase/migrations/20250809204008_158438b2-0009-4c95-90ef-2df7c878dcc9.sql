-- Agregar constraint único para prevenir duplicados futuros
-- Solo permite un rol activo por usuario en cada empresa
ALTER TABLE user_company_roles 
ADD CONSTRAINT unique_user_company_role_active 
UNIQUE (user_id, company_id, role) 
DEFERRABLE INITIALLY DEFERRED;