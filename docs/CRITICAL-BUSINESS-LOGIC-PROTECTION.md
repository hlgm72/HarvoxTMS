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

### 4. Sistema de Generación PDF de Reportes v1.0
**ESTADO: CRÍTICO - NO MODIFICAR SIN AUTORIZACIÓN**

#### Archivos Protegidos:
- `src/lib/paymentReportPDF.ts` - Lógica principal de generación de PDFs
- `src/components/payments/PaymentReportDialog.tsx` - Componente de visualización de reportes
- `supabase/functions/generate-email-content/index.ts` - Generación de contenido para emails
- `supabase/functions/send-payment-report/index.ts` - Envío de reportes por email

#### Funcionalidad Protegida:
- ✅ Generación exacta de PDFs con datos financieros críticos
- ✅ Formateo correcto de montos, fechas y períodos de pago
- ✅ Estructura y diseño del reporte PDF
- ✅ Cálculos de deducciones, ingresos y pagos netos
- ✅ Integración con datos de cargas, combustible y deducciones
- ✅ Envío automático de reportes por email
- ✅ Visualización en iframe para preview

#### Razón de Protección:
Este sistema genera los reportes oficiales de pago para conductores. Cualquier modificación puede afectar:
- Exactitud de información financiera en reportes oficiales
- Cumplimiento legal y contable de documentos de pago
- Confianza de conductores en la transparencia financiera
- Auditorías y procesos de contabilidad empresarial
- Consistencia en la presentación de datos críticos

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

## 🔄 RECÁLCULOS AUTOMÁTICOS DE PERÍODOS

### ⚡ EVENTOS QUE DISPARAN RECÁLCULO COMPLETO DEL PERÍODO:

#### **Al Crear o Editar Cargas:**
- ✅ **Crear nueva carga** → Recalcula automáticamente el período del conductor asignado
- ✅ **Editar carga existente** → Recalcula automáticamente el período del conductor afectado  
- ✅ **Cambiar driver de carga** → Recalcula automáticamente períodos de AMBOS conductores (anterior y nuevo)
- ✅ **Modificar total_amount** → Recalcula automáticamente `gross_earnings` del período
- ✅ **Cambiar fechas de carga** → Puede reasignar a diferente período y recalcular ambos

#### **Al Gestionar Gastos y Deducciones:**
- ✅ **Agregar/editar gastos de combustible** → Recalcula `fuel_expenses` del período
- ✅ **Agregar/editar deducciones** → Recalcula `total_deductions` del período
- ✅ **Agregar/editar otros ingresos** → Recalcula `other_income` del período

### 🧮 QUÉ SE RECALCULA AUTOMÁTICAMENTE:

```typescript
// Cada recálculo actualiza estos campos en driver_period_calculations:

1. gross_earnings    = Suma de total_amount de todas las cargas del período
2. fuel_expenses     = Suma de gastos de combustible del período  
3. total_deductions  = Suma de todas las deducciones aplicadas del período
4. other_income      = Suma de otros ingresos del período
5. total_income      = gross_earnings + other_income (calculado dinámicamente)
6. net_payment       = total_income - fuel_expenses - total_deductions (calculado dinámicamente)
7. has_negative_balance = net_payment < 0 (calculado dinámicamente)
```

### ⚙️ IMPLEMENTACIÓN TÉCNICA:

#### **Triggers de Base de Datos (CRÍTICOS):**
- **`auto_recalculate_on_loads`** - Se ejecuta en INSERT/UPDATE/DELETE de cargas
- **`trigger_recalc_driver_period_after_load()`** - Función específica para cargas
- **`auto_recalculate_on_fuel_expenses`** - Se ejecuta en cambios de combustible
- **`auto_recalculate_on_other_income`** - Se ejecuta en cambios de otros ingresos

#### **Funciones de Recálculo:**
- **`recalculate_driver_period_calculation`** - Recálculo específico por conductor
- **`calculate_driver_payment_period_v2`** - Recálculo completo con validaciones
- **`verify_and_recalculate_company_payments`** - Verificación integral de empresa

#### **Alcance del Recálculo:**
- ✅ **Automático e Inmediato** - No requiere intervención manual
- ✅ **Específico por Conductor** - Solo afecta al conductor y período correspondiente
- ✅ **Atómico** - Todo el recálculo se completa o falla como unidad
- ✅ **Auditado** - Cada recálculo queda registrado en logs

### 📊 EJEMPLO PRÁCTICO:

```sql
-- Al crear/editar carga:
INSERT INTO loads (driver_user_id, total_amount, ...) VALUES (...);

-- Automáticamente se ejecuta:
LOG: auto_recalculate_on_loads: Recálculo ejecutado para período [uuid]
LOG: calculate_driver_payment_period_v2 COMPLETED: 
     driver=[uuid], period=[uuid], 
     gross=[nuevo_total], net=[nuevo_neto]
```

## 🔧 TESTING DE FUNCIONES CRÍTICAS

### Verificaciones Obligatorias:
- ✅ Los períodos se crean SOLO cuando son necesarios
- ✅ NO se generan períodos futuros innecesarios
- ✅ La asignación de cargas usa el criterio correcto
- ✅ Los `driver_period_calculations` se crean correctamente
- ✅ **Los recálculos automáticos se ejecutan en CADA cambio de carga** 
- ✅ **Los totales se actualizan inmediatamente tras modificar cargas**
- ✅ Las funciones de cálculo matemático producen resultados correctos
- ✅ Los recálculos automáticos mantienen la integridad de datos
- ✅ Los reportes de pagos muestran información precisa

## 📞 CONTACTO PARA AUTORIZACIONES

**IMPORTANTE**: Antes de modificar cualquier función marcada como CRÍTICA, debes obtener autorización explícita del propietario del proyecto.

---
**Última actualización**: 2024-08-31  
**Versión del sistema**: v2.0 - Períodos Bajo Demanda