# 👨‍💻 GUÍA PARA DESARROLLADORES: Períodos de Pago

## 🎯 Filosofía del Sistema

**REGLA DE ORO**: Los períodos de pago se crean **SOLO** cuando hay transacciones reales que los requieren.

---

## 📋 CUÁNDO CREAR UN PERÍODO

### ✅ **Casos Válidos** (usar `ensurePaymentPeriodExists`):

```typescript
// 1. 🚛 Creación de Carga
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';

const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
await ensurePaymentPeriodExists({
  companyId: load.company_id,
  userId: load.driver_user_id,
  targetDate: load.delivery_date  // Fecha real de la carga
});
```

```typescript
// 2. ⛽ Gasto de Combustible  
await ensurePaymentPeriodExists({
  companyId: expense.company_id,
  userId: expense.driver_user_id,
  targetDate: expense.transaction_date  // Fecha del gasto
});
```

```typescript
// 3. 💸 Deducción (no recurrente)
await ensurePaymentPeriodExists({
  companyId: deduction.company_id,
  userId: deduction.user_id,
  targetDate: deduction.effective_date  // Fecha efectiva
});
```

```typescript
// 4. 💰 Otros Ingresos
await ensurePaymentPeriodExists({
  companyId: income.company_id,
  userId: income.user_id,
  targetDate: income.income_date  // Fecha del ingreso
});
```

### ❌ **Casos Inválidos** (NO crear períodos):

```typescript
// ❌ NO - Solo para mostrar datos sin transacciones
// ❌ NO - Para generar reportes futuros  
// ❌ NO - "Por si acaso" o anticipadamente
// ❌ NO - En triggers automáticos de base de datos
// ❌ NO - Para crear múltiples períodos a la vez
```

---

## 🛠️ IMPLEMENTACIÓN CORRECTA

### Hook Recomendado:
```typescript
// src/hooks/usePaymentPeriodGenerator.tsx
import { usePaymentPeriodGenerator } from '@/hooks/usePaymentPeriodGenerator';

export function useMyTransactionHook() {
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  
  const createTransaction = async (transactionData) => {
    try {
      // 1. Crear período solo si hay transacción real
      const periodId = await ensurePaymentPeriodExists({
        companyId: transactionData.company_id,
        userId: transactionData.user_id,
        targetDate: transactionData.transaction_date
      });
      
      // 2. Crear la transacción asociada al período
      const { data, error } = await supabase
        .from('my_table')
        .insert({
          ...transactionData,
          payment_period_id: periodId  // Asociar al período
        });
        
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  };
  
  return { createTransaction };
}
```

### Función SQL Disponible:
```sql
-- Solo usar desde hooks del frontend, NUNCA en triggers automáticos
SELECT create_payment_period_if_needed(
  target_company_id := 'company-uuid',
  target_date := '2025-01-15',
  created_by_user_id := 'user-uuid'
);
```

---

## 🚫 QUÉ NO HACER

### ❌ **Triggers Automáticos Prohibidos:**
```sql
-- ❌ NUNCA crear triggers como estos:
CREATE TRIGGER auto_create_period 
  BEFORE INSERT ON my_table
  FOR EACH ROW 
  EXECUTE FUNCTION create_payment_period_automatically();  -- ¡PROHIBIDO!
```

### ❌ **Generación Masiva Prohibida:**
```typescript
// ❌ NUNCA hacer esto:
for (let date = startDate; date <= endDate; date++) {
  await ensurePaymentPeriodExists({
    companyId,
    userId,  
    targetDate: date  // ¡Crea períodos innecesarios!
  });
}
```

### ❌ **Creación "Por Si Acaso" Prohibida:**
```typescript
// ❌ NUNCA hacer esto:
// "Voy a crear el período del próximo mes por si acaso"
await ensurePaymentPeriodExists({
  companyId,
  userId,
  targetDate: nextMonth  // ¡Sin transacción real!
});
```

---

## ✅ PATRONES APROBADOS

### 1. **Patrón de Transacción Individual:**
```typescript
const handleCreateExpense = async (expenseData) => {
  // ✅ Crear período solo cuando hay gasto real
  const periodId = await ensurePaymentPeriodExists({
    companyId: expenseData.company_id,
    userId: expenseData.driver_user_id,
    targetDate: expenseData.expense_date
  });
  
  // Crear el gasto asociado
  await createExpense({ ...expenseData, periodId });
};
```

### 2. **Patrón de Validación Previa:**
```typescript
const handleBulkImport = async (transactions) => {
  for (const transaction of transactions) {
    // ✅ Verificar que cada transacción sea válida
    if (!transaction.transaction_date || !transaction.amount) {
      continue; // Saltar transacciones inválidas
    }
    
    // ✅ Crear período solo para transacciones válidas
    const periodId = await ensurePaymentPeriodExists({
      companyId: transaction.company_id,
      userId: transaction.user_id,
      targetDate: transaction.transaction_date
    });
    
    // Procesar transacción real
    await processTransaction({ ...transaction, periodId });
  }
};
```

### 3. **Patrón de Formularios:**
```typescript
const TransactionForm = () => {
  const { ensurePaymentPeriodExists } = usePaymentPeriodGenerator();
  
  const onSubmit = async (formData) => {
    // ✅ Solo crear cuando el usuario confirma la transacción
    const periodId = await ensurePaymentPeriodExists({
      companyId: formData.company_id,
      userId: formData.user_id,
      targetDate: formData.date
    });
    
    // Crear transacción confirmada por usuario
    await submitTransaction({ ...formData, periodId });
  };
};
```

---

## 🔍 DEBUGGING Y VERIFICACIÓN

### Comandos de Verificación:
```sql
-- 1. Verificar períodos sospechosos
SELECT company_id, COUNT(*) as count, DATE(created_at) as date
FROM company_payment_periods 
WHERE created_at >= CURRENT_DATE - INTERVAL '3 days'
GROUP BY company_id, DATE(created_at)
HAVING COUNT(*) > 2;

-- 2. Verificar períodos vacíos (sin transacciones)
SELECT cpp.id, cpp.period_start_date, cpp.period_end_date,
  (SELECT COUNT(*) FROM loads WHERE payment_period_id = cpp.id) as loads,
  (SELECT COUNT(*) FROM fuel_expenses WHERE payment_period_id = cpp.id) as fuel,
  (SELECT COUNT(*) FROM driver_period_calculations WHERE company_payment_period_id = cpp.id) as calcs
FROM company_payment_periods cpp
WHERE cpp.created_at >= CURRENT_DATE - INTERVAL '7 days'
HAVING loads = 0 AND fuel = 0 AND calcs <= 2;  -- Solo cálculos automáticos vacíos
```

### Logs a Revisar:
```javascript
// En el frontend, siempre logear el contexto:
console.log('🔍 Creating period for real transaction:', {
  transactionType: 'fuel_expense',  // o 'load', 'deduction', etc.
  companyId,
  userId,
  targetDate,
  transactionId: expense.id  // ID de la transacción específica
});
```

---

## 📚 RECURSOS ADICIONALES

### Archivos Relacionados:
- `src/hooks/usePaymentPeriodGenerator.tsx` - Hook principal
- `docs/payment-periods-on-demand-system.md` - Documentación del sistema
- `docs/CRITICAL-PAYMENT-PERIODS-PREVENTION.md` - Prevención de problemas

### Funciones SQL Relevantes:
- `create_payment_period_if_needed()` - Función principal (uso controlado)
- `ensure_payment_period_exists()` - Wrapper simplificado

---

## ⚠️ RESPONSABILIDADES DEL DESARROLLADOR

1. **Antes de usar `ensurePaymentPeriodExists`:**
   - ✅ Verificar que hay una transacción real específica
   - ✅ Confirmar que el usuario inició la acción
   - ✅ Validar que no es una operación automática

2. **Al implementar nuevas funcionalidades:**
   - ✅ Documentar por qué se necesita crear un período
   - ✅ Revisar que sigue los patrones aprobados
   - ✅ Probar que no crea períodos innecesarios

3. **Al revisar código:**
   - ✅ Buscar usos de `ensurePaymentPeriodExists`
   - ✅ Verificar que cada uso tiene justificación válida
   - ✅ Confirmar que no hay triggers automáticos

---

**Recuerda: Cada período debe tener una razón específica y una transacción real que lo justifique.**