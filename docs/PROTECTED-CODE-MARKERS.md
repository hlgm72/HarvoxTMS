# 🚨 MARCADORES DE CÓDIGO PROTEGIDO

## Guía Rápida de Identificación

### 🚨 FUNCIÓN CRÍTICA - NO MODIFICAR SIN AUTORIZACIÓN
Este marcador identifica funciones individuales que son críticas para el negocio.

### 🚨 SECCIÓN CRÍTICA - NO MODIFICAR
Este marcador identifica bloques completos de código crítico.

### 🚨 SISTEMA [NOMBRE] v[VERSION] - CRÍTICO
Este marcador identifica sistemas completos que no deben modificarse.

## Archivos Actualmente Protegidos

### ✅ src/hooks/usePaymentPeriodGenerator.tsx
- Marcado como: `🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v2.0 - CRÍTICO`
- Función `ensurePaymentPeriodExists` marcada como crítica

### ✅ src/hooks/useCreateLoad.tsx
- Sección de períodos marcada como: `🚨 SISTEMA DE PERÍODOS BAJO DEMANDA v2.0 - CRÍTICO`

### ✅ src/components/fuel/CreateFuelExpenseDialog.tsx
- Función `ensurePaymentPeriodExists` marcada como: `🚨 CRÍTICO - SISTEMA BAJO DEMANDA v2.0`

## Cómo Identificar Código Protegido

1. Busca los emojis 🚨 en los comentarios
2. Lee la advertencia completa
3. Verifica en `docs/CRITICAL-BUSINESS-LOGIC-PROTECTION.md`
4. Solicita autorización antes de modificar

## Próximos Archivos por Proteger

- Deductions/Other Income components
- Payment calculation functions
- Report generation logic
- SQL functions (ya protegidas en DB)

---
**Recordatorio**: Siempre verificar ANTES de modificar cualquier código marcado.