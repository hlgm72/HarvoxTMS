# 🚨 PROTECCIÓN DE LÓGICA DE NEGOCIO CRÍTICA

## ⚠️ ADVERTENCIA IMPORTANTE
Las funciones y sistemas marcados como **CRÍTICOS** en este documento NO DEBEN ser modificados sin autorización EXPLÍCITA del propietario del proyecto.

## 🔒 FUNCIONES Y SISTEMAS CRÍTICOS PROTEGIDOS

### 1. Sistema de Períodos Bajo Demanda v2.0
**ESTADO: CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN**

#### Archivos Protegidos:
- `src/hooks/usePaymentPeriodGenerator.tsx` - Hook principal del sistema
- `src/hooks/useCreateLoad.tsx` - Implementación en creación de cargas
- `src/components/fuel/CreateFuelExpenseDialog.tsx` - Implementación en gastos de combustible
- Función SQL: `create_payment_period_if_needed`
- Función SQL: `ensure_payment_period_exists`

#### Funcionalidad Protegida:
- ✅ Generación de períodos SOLO bajo demanda
- ✅ NO generación de períodos futuros innecesarios
- ✅ Asignación automática basada en `load_assignment_criteria`
- ✅ Creación de `driver_period_calculations`
- ✅ Generación de gastos recurrentes

#### Razón de Protección:
Este sistema es fundamental para el correcto funcionamiento de los pagos y cálculos de conductores. Cualquier modificación puede afectar:
- Cálculos de pagos
- Generación de reportes
- Consistencia de datos
- Performance del sistema

### 2. Sistema de Cálculos de Pagos a Conductores v1.0
**ESTADO: CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN**

#### Archivos Protegidos:
- `src/lib/paymentCalculations.ts` - Biblioteca de cálculos matemáticos fundamentales
- `src/hooks/usePaymentPeriodSummary.tsx` - Hook de resúmenes con recálculos automáticos
- `src/components/payments/PaymentPeriodDetails.tsx` - Procesamiento de cálculos de períodos
- `src/components/driver/FinancialSummary.tsx` - Visualización de resúmenes financieros
- `src/components/payments/PaymentReportDialog.tsx` - Generación de reportes de pagos
- `src/pages/PaymentReports.tsx` - Página principal de reportes con recálculos

#### Funciones SQL Protegidas:
- `verify_and_recalculate_company_payments` - Verificación y recálculo integral
- `recalculate_payment_period_totals` - Recálculo de totales por período
- `auto_recalculate_on_loads` - Trigger de recálculo en cargas
- `auto_recalculate_on_fuel_expenses` - Trigger de recálculo en combustible
- `auto_recalculate_on_other_income` - Trigger de recálculo en otros ingresos

#### Funcionalidad Protegida:
- ✅ `calculateNetPayment()` - Cálculo de pago neto final
- ✅ `calculateTotalIncome()` - Cálculo de ingresos totales
- ✅ `calculateHasNegativeBalance()` - Detección de balances negativos
- ✅ Agregación de `gross_earnings` (ingresos brutos de cargas)
- ✅ Agregación de `fuel_expenses` (gastos de combustible)
- ✅ Agregación de `total_deductions` (deducciones aplicadas)
- ✅ Agregación de `other_income` (otros ingresos)
- ✅ Recálculos automáticos de integridad
- ✅ Verificación de consistencia de datos

#### Razón de Protección:
Este sistema maneja los cálculos financieros más críticos del negocio. Cualquier modificación puede afectar:
- Pagos incorrectos a conductores
- Reportes financieros erróneos
- Pérdidas económicas por errores de cálculo
- Problemas legales y laborales
- Inconsistencias contables
- Auditorías fallidas

### 3. Hook useCreateLoad
**ESTADO: CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN**

#### Lógica Protegida:
- Cálculo de fechas de pickup/delivery desde stops
- Obtención de `load_assignment_criteria` de la empresa
- Llamada a `ensurePaymentPeriodExists`
- Asignación de `payment_period_id`

## 🛡️ CÓMO IDENTIFICAR CÓDIGO CRÍTICO

### Marcadores en el Código:
```typescript
// 🚨 CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN
// Esta función es parte del sistema de períodos bajo demanda v2.0
// Cualquier cambio debe ser aprobado explícitamente
```

### Marcadores de Sección:
```typescript
// ===============================================
// 🚨 SECCIÓN CRÍTICA - NO MODIFICAR
// ===============================================
```

## 📋 PROTOCOLO PARA MODIFICACIONES

### ANTES de modificar código crítico:
1. ✅ Verificar si el archivo/función está marcado como CRÍTICO
2. ✅ Leer la documentación de protección
3. ✅ Solicitar autorización EXPLÍCITA al propietario
4. ✅ Documentar la razón del cambio
5. ✅ Crear backup del código actual

### NUNCA modificar sin autorización:
- ❌ Funciones marcadas como CRÍTICAS
- ❌ Lógica de períodos de pago
- ❌ Cálculos de asignación de cargas
- ❌ Funciones SQL del sistema de períodos
- ❌ Funciones matemáticas de cálculos de pagos (`calculateNetPayment`, `calculateTotalIncome`)
- ❌ Hooks de recálculo automático (`usePaymentPeriodSummary`)
- ❌ Componentes de procesamiento de pagos
- ❌ Triggers de recálculo en base de datos

## 🔧 TESTING DE FUNCIONES CRÍTICAS

### Verificaciones Obligatorias:
- ✅ Los períodos se crean SOLO cuando son necesarios
- ✅ NO se generan períodos futuros innecesarios
- ✅ La asignación de cargas usa el criterio correcto
- ✅ Los `driver_period_calculations` se crean correctamente
- ✅ Las funciones de cálculo matemático producen resultados correctos
- ✅ Los recálculos automáticos mantienen la integridad de datos
- ✅ Los reportes de pagos muestran información precisa

## 📞 CONTACTO PARA AUTORIZACIONES

**IMPORTANTE**: Antes de modificar cualquier función marcada como CRÍTICA, debes obtener autorización explícita del propietario del proyecto.

---
**Última actualización**: 2024-08-31  
**Versión del sistema**: v2.0 - Períodos Bajo Demanda