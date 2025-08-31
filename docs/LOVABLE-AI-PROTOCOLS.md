# 🚨 PROTOCOLO CRÍTICO PARA LOVABLE AI
## PREVENCIÓN DE ERRORES DE GENERACIÓN MASIVA DE PERÍODOS

⚠️ **ESTE DOCUMENTO ES CRÍTICO - DEBE SER CONSULTADO EN CADA SESIÓN**

### ❌ FUNCIONES PROHIBIDAS - NUNCA USAR
```sql
-- ESTAS FUNCIONES CAUSAN GENERACIÓN MASIVA:
- generate_payment_periods() - con rangos de fechas
- generate_company_payment_periods() - versión antigua  
- generate_company_payment_periods_with_calculations() - con rangos amplios

-- LÍNEAS DE CÓDIGO PROHIBIDAS:
target_date - INTERVAL '7 days', target_date + INTERVAL '30 days'
```

### ✅ FUNCIONES APROBADAS - SOLO USAR ESTAS
```sql
-- SISTEMA ON-DEMAND APROBADO:
create_payment_period_if_needed(company_id, target_date, user_id)
ensure_payment_period_exists(company_id, target_date)
```

### 🔍 CHECKLIST OBLIGATORIO ANTES DE MODIFICAR TRIGGERS
Antes de tocar cualquier trigger de `loads`, SIEMPRE verificar:

1. ¿Usa `generate_payment_periods()`? ❌ PROHIBIDO
2. ¿Usa rangos de fechas amplios? ❌ PROHIBIDO  
3. ¿Usa `create_payment_period_if_needed()`? ✅ CORRECTO
4. ¿Crea solo 1 período específico? ✅ CORRECTO

### 🚨 TRIGGERS CRÍTICOS A REVISAR
```sql
-- ESTOS TRIGGERS SON CRÍTICOS:
- assign_payment_period_to_load()
- assign_payment_period_on_date_change()  
- update_payment_period_on_date_change()
- trigger_recalc_driver_period_after_load()

-- SIEMPRE verificar que usen SOLO create_payment_period_if_needed()
```

### 📋 PROTOCOLO DE VERIFICACIÓN POST-CAMBIO
Después de cualquier cambio en triggers o funciones relacionadas con períodos:

```sql
-- 1. Verificar que no se crearon períodos innecesarios:
SELECT company_id, COUNT(*) as count, DATE(created_at) as date
FROM company_payment_periods 
WHERE created_at >= CURRENT_DATE
GROUP BY company_id, DATE(created_at)
HAVING COUNT(*) > 2;

-- 2. Si hay más de 2 períodos creados hoy = ERROR
-- 3. Investigar inmediatamente qué función causó el problema
```

### 🎯 REGLA DE ORO
**"UN PERÍODO, UNA FECHA, UNA NECESIDAD ESPECÍFICA"**
- Nunca generar múltiples períodos
- Nunca usar rangos de fechas amplios
- Siempre crear bajo demanda
- Siempre validar después del cambio

### 🛠️ COMANDO DE EMERGENCIA
Si se detecta generación masiva:
```sql
-- Borrar períodos innecesarios creados hoy:
DELETE FROM company_payment_periods 
WHERE created_at >= CURRENT_DATE 
AND id NOT IN (
  SELECT DISTINCT payment_period_id 
  FROM loads 
  WHERE payment_period_id IS NOT NULL
);
```

---
**ÚLTIMA ACTUALIZACIÓN**: 2025-01-31
**PRÓXIMA REVISIÓN OBLIGATORIA**: Cada vez que Lovable AI modifique triggers de períodos