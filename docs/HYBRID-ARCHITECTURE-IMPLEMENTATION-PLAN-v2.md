# 🚀 PLAN DE IMPLEMENTACIÓN - ARQUITECTURA HÍBRIDA v2.0
## Simplificado: Sin `total_income`, solo `net_payment`

---

## **FILOSOFÍA DE LA NUEVA ARQUITECTURA**

### **Principio Fundamental:**
> "Un período de pago por usuario solo existe si ese usuario tiene transacciones reales en ese período"

### **Fórmula ÚNICA de Cálculo:**
```typescript
net_payment = gross_earnings + other_income - fuel_expenses - total_deductions
```

**NO calculamos ni guardamos `total_income`** - es un paso intermedio innecesario.

### **Estructura de Datos:**
```
companies (configuración de pago)
    ↓
company_payment_periods (marco temporal compartido)
    ↓
user_payment_periods (cálculos individuales on-demand)
    ↓
loads, fuel_expenses, expense_instances, other_income
```

---

## **FASE 1: PREPARACIÓN Y RESPALDO** (30 minutos)

### 1.1 Crear Tablas de Respaldo

```sql
-- Respaldo completo de datos actuales
CREATE TABLE driver_period_calculations_backup_20250211 AS 
SELECT * FROM driver_period_calculations;

CREATE TABLE company_payment_periods_backup_20250211 AS 
SELECT * FROM company_payment_periods;

CREATE TABLE loads_backup_20250211 AS 
SELECT id, payment_period_id, driver_user_id, total_amount, created_at 
FROM loads;

-- Respaldo de foreign keys actuales
CREATE TABLE migration_fk_backup AS
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('loads', 'fuel_expenses', 'expense_instances', 'other_income');
```

### 1.2 Auditoría Pre-Migración

```sql
-- Crear tabla de auditoría
CREATE TABLE migration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  operation TEXT NOT NULL,
  records_affected INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES auth.users(id)
);

-- Registrar estado inicial
INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES 
  ('pre_migration', 'backup_driver_period_calculations', 
   (SELECT COUNT(*) FROM driver_period_calculations), 'completed'),
  ('pre_migration', 'backup_company_payment_periods', 
   (SELECT COUNT(*) FROM company_payment_periods), 'completed');
```

---

## **FASE 2: MIGRACIÓN DE SCHEMA** (1 hora)

### 2.1 Renombrar Tabla y Eliminar Columna Redundante

```sql
-- Paso 1: Renombrar la tabla
ALTER TABLE driver_period_calculations RENAME TO user_payment_periods;

-- Paso 2: Renombrar la columna clave
ALTER TABLE user_payment_periods 
RENAME COLUMN driver_user_id TO user_id;

-- Paso 3: ✅ ELIMINAR columna redundante total_income
ALTER TABLE user_payment_periods DROP COLUMN IF EXISTS total_income;

-- Paso 4: Añadir columna para tipo de usuario
ALTER TABLE user_payment_periods 
ADD COLUMN user_role TEXT DEFAULT 'driver' 
CHECK (user_role IN ('driver', 'dispatcher', 'operations_manager', 'company_owner'));

-- Log
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'rename_table_and_remove_total_income', 'completed');
```

### 2.2 Actualizar Índices

```sql
-- Eliminar índices antiguos
DROP INDEX IF EXISTS idx_driver_period_calculations_period_driver;
DROP INDEX IF EXISTS idx_driver_period_calculations_driver;
DROP INDEX IF EXISTS idx_driver_period_calculations_payment_status;

-- Crear nuevos índices optimizados
CREATE INDEX idx_user_payment_periods_period_user 
ON user_payment_periods(company_payment_period_id, user_id);

CREATE INDEX idx_user_payment_periods_user_status 
ON user_payment_periods(user_id, payment_status);

CREATE INDEX idx_user_payment_periods_status 
ON user_payment_periods(payment_status) 
WHERE payment_status != 'paid';

-- Índice para búsquedas por rol
CREATE INDEX idx_user_payment_periods_role 
ON user_payment_periods(user_role, payment_status);

-- Log
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'update_indexes', 'completed');
```

### 2.3 Actualizar Constraints

```sql
-- Añadir constraint único para evitar duplicados
ALTER TABLE user_payment_periods 
ADD CONSTRAINT unique_user_per_company_period 
UNIQUE (company_payment_period_id, user_id);

-- Constraint para validar user_id existe
ALTER TABLE user_payment_periods
ADD CONSTRAINT fk_user_payment_periods_user
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;
```

---

## **FASE 3: MIGRACIÓN DE FOREIGN KEYS** (1 hora)

### 3.1 Actualizar FK de `loads`

```sql
-- CRÍTICO: Crear user_payment_periods para loads existentes
INSERT INTO user_payment_periods (
  company_payment_period_id,
  user_id,
  gross_earnings,
  fuel_expenses,
  total_deductions,
  other_income,
  net_payment,
  has_negative_balance,
  payment_status,
  user_role
)
SELECT DISTINCT
  l.payment_period_id AS company_payment_period_id,
  l.driver_user_id AS user_id,
  0, 0, 0, 0, 0,
  false,
  'calculated',
  'driver'
FROM loads l
WHERE l.payment_period_id IS NOT NULL
  AND l.driver_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_payment_periods upp
    WHERE upp.company_payment_period_id = l.payment_period_id
      AND upp.user_id = l.driver_user_id
  );

-- Actualizar loads.payment_period_id para que apunte a user_payment_periods
ALTER TABLE loads ADD COLUMN user_payment_period_id UUID;

UPDATE loads l
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = l.payment_period_id
    AND upp.user_id = l.driver_user_id
  LIMIT 1
)
WHERE l.payment_period_id IS NOT NULL 
  AND l.driver_user_id IS NOT NULL;

-- Eliminar constraint antigua y renombrar
ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_payment_period_id_fkey;
ALTER TABLE loads DROP COLUMN payment_period_id;
ALTER TABLE loads RENAME COLUMN user_payment_period_id TO payment_period_id;

-- Añadir nueva FK
ALTER TABLE loads
ADD CONSTRAINT loads_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;

-- Log
INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES ('fk_migration', 'update_loads_fk', 
  (SELECT COUNT(*) FROM loads WHERE payment_period_id IS NOT NULL), 
  'completed');
```

### 3.2 Actualizar FK de `fuel_expenses`

```sql
ALTER TABLE fuel_expenses ADD COLUMN user_payment_period_id UUID;

UPDATE fuel_expenses fe
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
  WHERE upp.user_id = fe.driver_user_id
    AND fe.transaction_date BETWEEN cpp.period_start_date AND cpp.period_end_date
  LIMIT 1
)
WHERE fe.payment_period_id IS NOT NULL;

ALTER TABLE fuel_expenses DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;
ALTER TABLE fuel_expenses DROP COLUMN payment_period_id;
ALTER TABLE fuel_expenses RENAME COLUMN user_payment_period_id TO payment_period_id;

ALTER TABLE fuel_expenses
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;
```

### 3.3 Actualizar FK de `expense_instances` y `other_income`

```sql
-- expense_instances ya apunta a user_payment_periods
ALTER TABLE expense_instances 
DROP CONSTRAINT IF EXISTS expense_instances_payment_period_id_fkey;

ALTER TABLE expense_instances
ADD CONSTRAINT expense_instances_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;

-- other_income
ALTER TABLE other_income
DROP CONSTRAINT IF EXISTS other_income_payment_period_id_fkey;

ALTER TABLE other_income
ADD CONSTRAINT other_income_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;
```

---

## **FASE 4: ACTUALIZAR FUNCIONES SQL CRÍTICAS** (2 horas)

### 4.1 Actualizar `create_payment_period_if_needed`

```sql
-- Nueva versión simplificada que SOLO crea company_payment_period
CREATE OR REPLACE FUNCTION create_payment_period_if_needed(
  target_company_id UUID,
  target_date DATE,
  requesting_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_id UUID;
  company_settings RECORD;
  calculated_start_date DATE;
  calculated_end_date DATE;
BEGIN
  IF target_company_id IS NULL OR target_date IS NULL THEN
    RAISE EXCEPTION 'company_id y target_date son obligatorios';
  END IF;

  SELECT 
    default_payment_frequency,
    payment_cycle_start_day,
    payment_day
  INTO company_settings
  FROM companies
  WHERE id = target_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada: %', target_company_id;
  END IF;

  -- Calcular fechas según frecuencia
  CASE company_settings.default_payment_frequency
    WHEN 'weekly' THEN
      calculated_start_date := date_trunc('week', target_date)::DATE + (company_settings.payment_cycle_start_day - 1);
      calculated_end_date := calculated_start_date + INTERVAL '6 days';
    WHEN 'biweekly' THEN
      calculated_start_date := date_trunc('week', target_date)::DATE;
      calculated_end_date := calculated_start_date + INTERVAL '13 days';
    WHEN 'monthly' THEN
      calculated_start_date := date_trunc('month', target_date)::DATE;
      calculated_end_date := (date_trunc('month', target_date) + INTERVAL '1 month - 1 day')::DATE;
  END CASE;

  -- Buscar período existente
  SELECT id INTO period_id
  FROM company_payment_periods
  WHERE company_id = target_company_id
    AND period_start_date = calculated_start_date
    AND period_end_date = calculated_end_date;

  -- Si no existe, crear
  IF period_id IS NULL THEN
    INSERT INTO company_payment_periods (
      company_id,
      period_start_date,
      period_end_date,
      period_frequency,
      period_type,
      status
    ) VALUES (
      target_company_id,
      calculated_start_date,
      calculated_end_date,
      company_settings.default_payment_frequency,
      'regular',
      'open'
    ) RETURNING id INTO period_id;

    RAISE LOG 'create_payment_period_if_needed: Created period % for company %',
      period_id, target_company_id;
  END IF;

  RETURN period_id;
END;
$$;
```

### 4.2 Crear Nueva Función `ensure_user_payment_period`

```sql
-- NUEVA FUNCIÓN: Crear user_payment_period on-demand
CREATE OR REPLACE FUNCTION ensure_user_payment_period(
  target_user_id UUID,
  target_company_payment_period_id UUID,
  user_role_param TEXT DEFAULT 'driver'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_period_id UUID;
  company_id_check UUID;
BEGIN
  IF target_user_id IS NULL OR target_company_payment_period_id IS NULL THEN
    RAISE EXCEPTION 'user_id y company_payment_period_id son obligatorios';
  END IF;

  -- Verificar que el usuario pertenece a la empresa del período
  SELECT cpp.company_id INTO company_id_check
  FROM company_payment_periods cpp
  WHERE cpp.id = target_company_payment_period_id;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = target_user_id
      AND ucr.company_id = company_id_check
      AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Usuario % no pertenece a la empresa del período',
      target_user_id;
  END IF;

  -- Buscar user_payment_period existente
  SELECT id INTO user_period_id
  FROM user_payment_periods
  WHERE company_payment_period_id = target_company_payment_period_id
    AND user_id = target_user_id;

  -- Si no existe, crear
  IF user_period_id IS NULL THEN
    INSERT INTO user_payment_periods (
      company_payment_period_id,
      user_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      net_payment,
      has_negative_balance,
      payment_status,
      user_role
    ) VALUES (
      target_company_payment_period_id,
      target_user_id,
      0, 0, 0, 0, 0,
      false,
      'calculated',
      user_role_param
    ) RETURNING id INTO user_period_id;

    RAISE LOG 'ensure_user_payment_period: Created % for user %',
      user_period_id, target_user_id;
  END IF;

  RETURN user_period_id;
END;
$$;
```

### 4.3 Actualizar Función de Recálculo (SIMPLIFICADA)

```sql
-- ✅ VERSIÓN SIMPLIFICADA: Sin calcular total_income
CREATE OR REPLACE FUNCTION calculate_user_payment_period_with_validation(
  calculation_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc_record RECORD;
  company_period_record RECORD;
  result JSONB;
  
  -- Valores calculados
  calc_gross_earnings NUMERIC := 0;
  calc_fuel_expenses NUMERIC := 0;
  calc_total_deductions NUMERIC := 0;
  calc_other_income NUMERIC := 0;
  calc_net_payment NUMERIC := 0;
BEGIN
  -- Obtener registro de cálculo
  SELECT * INTO calc_record
  FROM user_payment_periods
  WHERE id = calculation_id_param;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Calculation not found');
  END IF;

  -- Verificar que no esté bloqueado
  SELECT * INTO company_period_record
  FROM company_payment_periods
  WHERE id = calc_record.company_payment_period_id;

  IF company_period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Period is locked');
  END IF;

  -- CALCULAR GROSS EARNINGS
  SELECT COALESCE(SUM(l.total_amount), 0) INTO calc_gross_earnings
  FROM loads l
  WHERE l.payment_period_id = calculation_id_param
    AND l.driver_user_id = calc_record.user_id;

  -- CALCULAR FUEL EXPENSES
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO calc_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.payment_period_id = calculation_id_param
    AND fe.driver_user_id = calc_record.user_id
    AND fe.status = 'approved';

  -- CALCULAR TOTAL DEDUCTIONS
  SELECT COALESCE(SUM(ei.amount), 0) INTO calc_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id_param
    AND ei.user_id = calc_record.user_id
    AND ei.status IN ('planned', 'applied');

  -- CALCULAR OTHER INCOME
  SELECT COALESCE(SUM(oi.amount), 0) INTO calc_other_income
  FROM other_income oi
  WHERE oi.payment_period_id = calculation_id_param
    AND oi.user_id = calc_record.user_id;

  -- ✅ CÁLCULO DIRECTO DE NET PAYMENT (sin total_income intermedio)
  calc_net_payment := calc_gross_earnings + calc_other_income - calc_fuel_expenses - calc_total_deductions;

  -- ACTUALIZAR REGISTRO (SIN total_income)
  UPDATE user_payment_periods
  SET 
    gross_earnings = calc_gross_earnings,
    fuel_expenses = calc_fuel_expenses,
    total_deductions = calc_total_deductions,
    other_income = calc_other_income,
    net_payment = calc_net_payment,
    has_negative_balance = (calc_net_payment < 0),
    calculated_at = NOW(),
    calculated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = calculation_id_param;

  -- ✅ RESULTADO SIN total_income
  result := jsonb_build_object(
    'success', true,
    'calculation_id', calculation_id_param,
    'gross_earnings', calc_gross_earnings,
    'fuel_expenses', calc_fuel_expenses,
    'total_deductions', calc_total_deductions,
    'other_income', calc_other_income,
    'net_payment', calc_net_payment,
    'has_negative_balance', (calc_net_payment < 0)
  );

  RETURN result;
END;
$$;
```

---

## **FASE 5: ACTUALIZAR TRIGGERS** (2 horas)

### 5.1 Eliminar Triggers Antiguos

```sql
DROP TRIGGER IF EXISTS trigger_auto_assign_payment_period_to_load ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_changes ON loads;
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_update ON loads;
DROP TRIGGER IF EXISTS auto_create_driver_calculations_trigger ON company_payment_periods;
DROP FUNCTION IF EXISTS auto_create_driver_calculations();

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('trigger_cleanup', 'remove_old_triggers', 'completed');
```

### 5.2 Nuevo Trigger de Asignación

```sql
-- NUEVO TRIGGER: Asignar user_payment_period a loads
CREATE OR REPLACE FUNCTION assign_user_payment_period_to_load()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_period_id UUID;
  user_period_id UUID;
  target_company_id UUID;
BEGIN
  IF NEW.driver_user_id IS NULL OR NEW.created_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener company_id del driver
  SELECT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = NEW.driver_user_id
    AND ucr.is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE WARNING 'Driver % no tiene empresa activa', NEW.driver_user_id;
    RETURN NEW;
  END IF;

  -- Paso 1: Asegurar company_payment_period
  company_period_id := create_payment_period_if_needed(
    target_company_id,
    NEW.created_at::DATE,
    auth.uid()
  );

  -- Paso 2: Asegurar user_payment_period
  user_period_id := ensure_user_payment_period(
    NEW.driver_user_id,
    company_period_id,
    'driver'
  );

  NEW.payment_period_id := user_period_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_user_payment_period_to_load
  BEFORE INSERT OR UPDATE OF driver_user_id, created_at
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_payment_period_to_load();
```

### 5.3 Nuevo Trigger de Recálculo

```sql
-- TRIGGER: Auto-recalcular después de cambios
CREATE OR REPLACE FUNCTION auto_recalculate_user_payment_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_period_id UUID;
BEGIN
  -- Determinar el user_payment_period_id según la tabla
  CASE TG_TABLE_NAME
    WHEN 'loads' THEN
      target_user_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'fuel_expenses' THEN
      target_user_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'expense_instances' THEN
      target_user_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    WHEN 'other_income' THEN
      target_user_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END CASE;

  IF target_user_period_id IS NOT NULL THEN
    PERFORM calculate_user_payment_period_with_validation(target_user_period_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar a todas las tablas relevantes
CREATE TRIGGER trigger_auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_payment_period();

CREATE TRIGGER trigger_auto_recalc_fuel
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_payment_period();

CREATE TRIGGER trigger_auto_recalc_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_payment_period();

CREATE TRIGGER trigger_auto_recalc_income
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_user_payment_period();
```

---

## **FASE 6: ACTUALIZAR RLS POLICIES** (1 hora)

```sql
-- Eliminar policies antiguas
DROP POLICY IF EXISTS "Driver period calculations select policy" ON user_payment_periods;
DROP POLICY IF EXISTS "driver_period_calculations_delete_immutable_after_payment" ON user_payment_periods;
DROP POLICY IF EXISTS "driver_period_calculations_update_immutable_after_payment" ON user_payment_periods;

-- NUEVA POLICY: SELECT
CREATE POLICY "user_payment_periods_select"
ON user_payment_periods
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    auth.uid() = user_id
    OR
    company_payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
    )
  )
);

-- NUEVA POLICY: UPDATE (solo si no está pagado)
CREATE POLICY "user_payment_periods_update"
ON user_payment_periods
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND NOT cpp.is_locked
  )
  AND payment_status != 'paid'
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- NUEVA POLICY: DELETE
CREATE POLICY "user_payment_periods_delete"
ON user_payment_periods
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'superadmin')
      AND NOT cpp.is_locked
  )
  AND payment_status != 'paid'
);
```

---

## **FASE 7: ACTUALIZAR CÓDIGO FRONTEND** (3 horas)

### 7.1 Actualizar `src/lib/paymentCalculations.ts`

```typescript
// ===============================================
// 🚨 SISTEMA DE CÁLCULOS DE PAGOS - CRÍTICO v2.0
// ⚠️ NO MODIFICAR SIN AUTORIZACIÓN EXPLÍCITA
// ===============================================

export interface PaymentCalculation {
  gross_earnings: number;
  other_income: number;
  fuel_expenses: number;
  total_deductions: number;
}

/**
 * 🚨 CRÍTICO - Calcula el pago neto DIRECTAMENTE
 * net_payment = gross_earnings + other_income - fuel_expenses - total_deductions
 * NO MODIFICAR SIN AUTORIZACIÓN - ESTA ES LA ÚNICA FUNCIÓN DE CÁLCULO
 */
export function calculateNetPayment(calculation: PaymentCalculation): number {
  return (
    (calculation.gross_earnings || 0) + 
    (calculation.other_income || 0) - 
    (calculation.fuel_expenses || 0) - 
    (calculation.total_deductions || 0)
  );
}

/**
 * 🚨 CRÍTICO - Calcula si el balance es negativo
 * NO MODIFICAR SIN AUTORIZACIÓN
 */
export function calculateHasNegativeBalance(calculation: PaymentCalculation): boolean {
  return calculateNetPayment(calculation) < 0;
}

// ❌ ELIMINADO: calculateTotalIncome() - innecesario
```

### 7.2 Actualizar `src/lib/financial-core/calculations.ts`

```typescript
// Eliminar función calculateTotalIncome()
// Actualizar calculateCompleteFinancialResult para calcular net directo

export function calculateCompleteFinancialResult(
  calculation: PaymentCalculation
): FinancialCalculationResult {
  // Validar input
  validatePaymentCalculation(calculation);
  
  // ✅ Calcular net_payment DIRECTAMENTE
  const netPayment = (
    (calculation.gross_earnings || 0) + 
    (calculation.other_income || 0) - 
    (calculation.fuel_expenses || 0) - 
    (calculation.total_deductions || 0)
  );
  
  const hasNegativeBalance = netPayment < 0;
  
  // Generar hash de integridad
  const integrityHash = generateIntegrityHash({
    gross_earnings: calculation.gross_earnings,
    other_income: calculation.other_income,
    fuel_expenses: calculation.fuel_expenses,
    total_deductions: calculation.total_deductions,
    net_payment: roundCurrency(netPayment)
  });
  
  return {
    gross_earnings: roundCurrency(calculation.gross_earnings),
    other_income: roundCurrency(calculation.other_income),
    fuel_expenses: roundCurrency(calculation.fuel_expenses),
    total_deductions: roundCurrency(calculation.total_deductions),
    net_payment: roundCurrency(netPayment),
    has_negative_balance: hasNegativeBalance,
    integrity_hash: integrityHash,
    integrity_state: 'valid',
    calculated_at: new Date().toISOString()
  };
}
```

### 7.3 Actualizar Hooks

**Si el UI necesita mostrar "Total Income" (opcional):**

```typescript
// En componentes que necesiten mostrar "total income" para display
const displayTotalIncome = useMemo(() => {
  return gross_earnings + other_income;
}, [gross_earnings, other_income]);
```

**Actualizar queries:**
- Cambiar `driver_period_calculations` → `user_payment_periods`
- Cambiar `driver_user_id` → `user_id`
- NO solicitar ni usar `total_income` de la base de datos

---

## **FASE 8: TESTING Y VALIDACIÓN** (2 horas)

### 8.1 Tests de Integridad

```sql
-- Test: Verificar que total_income NO existe en la tabla
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_payment_periods' 
  AND column_name = 'total_income';
-- Resultado esperado: 0 rows

-- Test: Verificar cálculos de net_payment
SELECT 
  id,
  gross_earnings,
  other_income,
  fuel_expenses,
  total_deductions,
  net_payment,
  (gross_earnings + other_income - fuel_expenses - total_deductions) as calculated_net
FROM user_payment_periods
WHERE ABS((gross_earnings + other_income - fuel_expenses - total_deductions) - net_payment) > 0.01;
-- Resultado esperado: 0 rows

-- Test: Verificar que no hay períodos duplicados
SELECT 
  company_payment_period_id,
  user_id,
  COUNT(*) as duplicates
FROM user_payment_periods
GROUP BY company_payment_period_id, user_id
HAVING COUNT(*) > 1;
-- Resultado esperado: 0 rows
```

### 8.2 Tests Funcionales

1. **Test Crear Carga:**
   - Crear carga con driver
   - Verificar que se crea `company_payment_period`
   - Verificar que se crea `user_payment_period`
   - Verificar que `gross_earnings` se actualiza
   - Verificar que `net_payment` se calcula correctamente

2. **Test Fuel Expense:**
   - Añadir fuel expense
   - Verificar que `fuel_expenses` se actualiza
   - Verificar que `net_payment` se recalcula

3. **Test Deduction:**
   - Crear deducción
   - Verificar que `total_deductions` se actualiza
   - Verificar que `net_payment` se recalcula

4. **Test Other Income:**
   - Añadir other income
   - Verificar que `other_income` se actualiza
   - Verificar que `net_payment` se recalcula

---

## **FASE 9: DOCUMENTACIÓN** (1 hora)

Actualizar todos los documentos para reflejar:
- Eliminación de `total_income`
- Cálculo directo de `net_payment`
- Nueva arquitectura híbrida

Archivos a actualizar:
- `docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md`
- `docs/LOVABLE-AI-PROTOCOLS.md`
- `docs/FINANCIAL_CALCULATIONS_PROTECTION.md`
- README.md

---

## **FASE 10: LIMPIEZA Y MONITOREO** (1 hora)

```sql
-- Eliminar funciones deprecadas
DROP FUNCTION IF EXISTS calculate_driver_payment_period_v2(UUID);
DROP FUNCTION IF EXISTS calculate_driver_payment_period(UUID);
DROP FUNCTION IF EXISTS calculateTotalIncome; -- Si existe

-- Vista de monitoreo
CREATE OR REPLACE VIEW payment_periods_health_check AS
SELECT 
  'Total company periods' as metric,
  COUNT(*)::TEXT as value
FROM company_payment_periods
UNION ALL
SELECT 
  'Total user periods',
  COUNT(*)::TEXT
FROM user_payment_periods
UNION ALL
SELECT 
  'Calculation mismatches',
  COUNT(*)::TEXT
FROM user_payment_periods
WHERE ABS((gross_earnings + other_income - fuel_expenses - total_deductions) - net_payment) > 0.01;
```

---

## **FASE 11: ROLLBACK PLAN**

```sql
-- Restaurar desde respaldos si es necesario
DROP TABLE IF EXISTS user_payment_periods;
CREATE TABLE driver_period_calculations AS 
SELECT * FROM driver_period_calculations_backup_20250211;

-- Restaurar foreign keys desde migration_fk_backup
-- Revertir código frontend usando Git
```

---

## **CRONOGRAMA ESTIMADO**

| Fase | Duración | Descripción |
|------|----------|-------------|
| 1 | 30 min | Preparación y respaldos |
| 2 | 1 hora | Migración de schema |
| 3 | 1 hora | Migración de foreign keys |
| 4 | 2 horas | Actualizar funciones SQL |
| 5 | 2 horas | Actualizar triggers |
| 6 | 1 hora | Actualizar RLS policies |
| 7 | 3 horas | Actualizar código frontend |
| 8 | 2 horas | Testing y validación |
| 9 | 1 hora | Documentación |
| 10 | 1 hora | Limpieza y monitoreo |
| **TOTAL** | **14.5 horas** | |

---

## **CHECKLIST DE VALIDACIÓN**

- [ ] Tabla `user_payment_periods` creada
- [ ] Columna `total_income` eliminada de DB ✅
- [ ] Función `calculateTotalIncome()` eliminada del código ✅
- [ ] Cálculo directo de `net_payment` implementado
- [ ] Foreign keys actualizadas
- [ ] Funciones SQL actualizadas
- [ ] Triggers actualizados
- [ ] RLS policies actualizadas
- [ ] Código frontend actualizado
- [ ] Tests pasando (0 inconsistencias)
- [ ] Documentación actualizada
- [ ] Sistema de monitoreo activo
- [ ] Fórmula única: `net_payment = gross_earnings + other_income - fuel_expenses - total_deductions` ✅
