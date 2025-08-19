# 🚨 REPORTE DE AUDITORÍA DE ZONAS HORARIAS

## Problemas Encontrados

### ❌ 1. VIOLACIONES DE UTC EN BASE DE DATOS

**Archivos con problemas:**

#### src/components/driver/FinancialSummary.tsx
- **Líneas 87-88**: Usando `new Date().toISOString()` como fallback para consultas
- **Línea 116**: Creando timestamp actual en tiempo local
- **Línea 129**: `toISOString().split('T')[0]` - violación directa
- **Líneas 208, 257**: Usando `toLocaleDateString()` directamente

#### src/components/invitations/PendingInvitationsSection.tsx  
- **Línea 107**: `new Date().toISOString()` para consultas
- **Línea 186**: `new Date().toISOString()` para updates

#### src/components/debug/DateDebugger.tsx
- **Línea 7**: `new Date().toISOString().split('T')[0]` - violación directa

#### src/components/dashboard/CommandMap.tsx
- **Líneas 132, 218**: Usando `toLocaleTimeString()` sin conversión de zona horaria

### ❌ 2. FILTROS Y BÚSQUEDAS SIN NORMALIZACIÓN UTC

#### src/components/loads/PeriodFilter.tsx
- **Líneas 39-74**: Los filtros de fecha usan `formatDateInUserTimeZone()` pero deberían convertir a UTC para consultas

#### src/hooks/useFuelExpenses.tsx y useFuelStats.tsx
- Los filtros de fecha se pasan directamente sin conversión a UTC

#### src/components/payments/EventualDeductionsList.tsx
- **Líneas 70-73**: Filtros de fecha sin conversión a UTC

### ❌ 3. COMPARACIONES DE FECHAS INCORRECTAS

#### src/components/driver/LoadsManager.tsx
- **Líneas 297, 411**: Comparando fechas con `new Date()` directo
- **Líneas 104-110**: Usando `formatDateSafe` que puede tener problemas de zona horaria

### ❌ 4. DISPLAY DE FECHAS INCONSISTENTE

#### src/components/driver/FinancialSummary.tsx
- **Líneas 208, 257**: Mezclando `toLocaleDateString()` con funciones de formateo

## ✅ IMPLEMENTACIÓN CORRECTA REQUERIDA

### 1. Backend/DB → Siempre UTC
- Todas las inserciones deben convertir fecha local a UTC
- Todas las consultas con fechas deben usar UTC

### 2. Frontend/UI → Mostrar en hora local
- Usar `formatDateTimeAuto()` y funciones centralizadas
- NO usar `toLocaleDateString()` o `toLocaleTimeString()` directamente

### 3. Filtros → Normalizar a UTC
- Convertir rangos de fecha del usuario a UTC antes de consultar
- Usar `new Date(userDate).toISOString()` después de ajustes de zona horaria

## 🔧 FUNCIONES A CREAR

```typescript
// Convertir fecha de usuario a UTC para consultas
export const convertUserDateToUTC = (userDate: Date): string => {
  return new Date(userDate.getTime() - (userDate.getTimezoneOffset() * 60000)).toISOString();
};

// Obtener fecha actual en UTC para consultas
export const getCurrentUTC = (): string => {
  return new Date().toISOString();
};
```

## 📋 PRÓXIMOS PASOS

1. ✅ Corregir todas las violaciones de UTC en base de datos
2. ✅ Actualizar filtros para convertir a UTC
3. ✅ Estandarizar display de fechas
4. ✅ Crear funciones utilitarias centralizadas
5. ✅ Actualizar DateDebugger para mostrar diferencias