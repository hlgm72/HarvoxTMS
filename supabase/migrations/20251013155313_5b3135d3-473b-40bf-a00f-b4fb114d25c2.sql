-- ==========================================
-- MIGRATION: Make expense_types company-specific (Final Fix)
-- ==========================================

-- 1. Add company_id column to expense_types (nullable initially)
ALTER TABLE expense_types 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_expense_types_company_id ON expense_types(company_id);

-- 3. Assign company_id to expense_types based on their usage in expense_instances
UPDATE expense_types et
SET company_id = (
  SELECT DISTINCT ucr.company_id
  FROM expense_instances ei
  JOIN user_company_roles ucr ON ei.user_id = ucr.user_id AND ucr.is_active = true
  WHERE ei.expense_type_id = et.id
  LIMIT 1
)
WHERE et.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM expense_instances WHERE expense_type_id = et.id
);

-- 4. Assign company_id to expense_types based on their usage in recurring templates
UPDATE expense_types et
SET company_id = (
  SELECT DISTINCT ucr.company_id
  FROM expense_recurring_templates ert
  JOIN user_company_roles ucr ON ert.user_id = ucr.user_id AND ucr.is_active = true
  WHERE ert.expense_type_id = et.id
  LIMIT 1
)
WHERE et.company_id IS NULL
AND EXISTS (
  SELECT 1 FROM expense_recurring_templates WHERE expense_type_id = et.id
);

-- 5. For expense_types still without company_id, duplicate for each active company
DO $$
DECLARE
  company_rec RECORD;
  type_rec RECORD;
  new_type_id UUID;
BEGIN
  FOR company_rec IN 
    SELECT id FROM companies WHERE status = 'active'
  LOOP
    FOR type_rec IN 
      SELECT * FROM expense_types WHERE company_id IS NULL
    LOOP
      -- Check if this company already has this type
      IF NOT EXISTS (
        SELECT 1 FROM expense_types 
        WHERE company_id = company_rec.id 
        AND name = type_rec.name 
        AND category = type_rec.category
      ) THEN
        -- Duplicate the type for this company
        INSERT INTO expense_types (
          company_id,
          name,
          category,
          description,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          company_rec.id,
          type_rec.name,
          type_rec.category,
          type_rec.description,
          type_rec.is_active,
          now(),
          now()
        )
        RETURNING id INTO new_type_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 6. Assign first active company to remaining types without company_id
UPDATE expense_types et
SET company_id = (
  SELECT id FROM companies WHERE status = 'active' LIMIT 1
)
WHERE et.company_id IS NULL;

-- 7. Make company_id NOT NULL
ALTER TABLE expense_types 
ALTER COLUMN company_id SET NOT NULL;

-- 8. Drop old RLS policies
DROP POLICY IF EXISTS "expense_types_select_active" ON expense_types;
DROP POLICY IF EXISTS "Expense types authenticated read access" ON expense_types;

-- 9. Create new RLS policies for company-specific access
CREATE POLICY "expense_types_company_select"
ON expense_types
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "expense_types_company_insert"
ON expense_types
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "expense_types_company_update"
ON expense_types
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "expense_types_company_delete"
ON expense_types
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);