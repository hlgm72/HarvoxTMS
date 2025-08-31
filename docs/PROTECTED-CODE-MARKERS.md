# 🚨 MARCADORES DE CÓDIGO PROTEGIDO

## Guía Rápida de Identificación

### 🚨 FUNCIÓN CRÍTICA - NO MODIFICAR SIN AUTORIZACIÓN
Este marcador identifica funciones individuales que son críticas para el negocio.

### 🚨 SECCIÓN CRÍTICA - NO MODIFICAR
Este marcador identifica bloques completos de código crítico.

### 🚨 SISTEMA [NOMBRE] v[VERSION] - CRÍTICO
Este marcador identifica sistemas completos que no deben modificarse.

## Archivos Actualmente Protegidos

### ✅ src/lib/paymentCalculations.ts
- Marcado como: `🚨 SISTEMA DE CÁLCULOS DE PAGOS - CRÍTICO v1.0`
- Funciones críticas: `calculateNetPayment`, `calculateTotalIncome`, `calculateHasNegativeBalance`

### ✅ src/hooks/usePaymentPeriodGenerator.tsx
- Marcado como: `🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v2.0 - CRÍTICO`
- Función `ensurePaymentPeriodExists` marcada como crítica

### ✅ src/hooks/usePaymentPeriodSummary.tsx
- Marcado como: `🚨 HOOK DE RESÚMENES DE PERÍODOS - CRÍTICO v1.0`
- Funciones de recálculo automático protegidas

### ✅ src/hooks/useCreateLoad.tsx
- Sección de períodos marcada como: `🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v2.0 - CRÍTICO`

### ✅ src/components/payments/PaymentPeriodDetails.tsx
- Marcado como: `🚨 COMPONENTE DE DETALLES DE PERÍODOS - CRÍTICO v1.0`
- Agregaciones financieras marcadas como críticas

### ✅ src/components/driver/FinancialSummary.tsx
- Marcado como: `🚨 COMPONENTE RESUMEN FINANCIERO - CRÍTICO v1.0`
- Uso de `calculateNetPayment` marcado como crítico

### ✅ src/components/fuel/CreateFuelExpenseDialog.tsx
- Función `ensurePaymentPeriodExists` marcada como: `🚨 CRÍTICO - SISTEMA BAJO DEMANDA v2.0`

### ✅ src/lib/paymentReportPDF.ts
- Marcado como: `🚨 SISTEMA GENERACIÓN PDF DE REPORTES - CRÍTICO v1.0`
- Función `generatePaymentReportPDF` marcada como crítica

### ✅ src/components/payments/PaymentReportDialog.tsx
- Marcado como: `🚨 COMPONENTE GENERACIÓN PDF REPORTES - CRÍTICO v1.0`
- Función `getReportData` marcada como crítica

## Cómo Identificar Código Protegido

1. Busca los emojis 🚨 en los comentarios
2. Lee la advertencia completa
3. Verifica en `docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md`
4. Solicita autorización antes de modificar

## Próximos Archivos por Proteger

- `src/components/payments/PaymentReportDialog.tsx` - Generación de reportes críticos
- `src/pages/PaymentReports.tsx` - Página principal de reportes
- Deductions/Other Income components
- Report generation logic
- SQL functions (ya protegidas en DB)

---
**Recordatorio**: Siempre verificar ANTES de modificar cualquier código marcado.