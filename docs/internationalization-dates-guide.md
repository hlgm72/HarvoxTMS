# Guía de Internacionalización de Fechas y Monedas - FleetNest

## 📋 Resumen

Este documento detalla la implementación completa de internacionalización automática para fechas y monedas en FleetNest TMS. **TODA nueva funcionalidad debe seguir estas reglas para mantener consistencia.**

## 🎯 Estado Actual

✅ **100% Completado** - Todas las fechas y monedas respetan automáticamente el idioma seleccionado:
- **Español**: `dd/mm/yyyy` y formato de moneda en español
- **Inglés**: `mm/dd/yyyy` y formato de moneda en inglés

## 🛠️ Arquitectura del Sistema

### Archivos Centrales

1. **`src/lib/dateFormatting.ts`** - Funciones centralizadas principales
2. **`src/utils/dateUtils.ts`** - Funciones base y utilitarios
3. **`src/hooks/useLocalizedDate.tsx`** - Hook para componentes que necesiten acceso directo
4. **`src/hooks/useInternationalizedFormat.tsx`** - Hook con date-fns avanzado
5. **`src/IMPORTANT_DATE_RULES.md`** - Reglas críticas (LEER ANTES DE TOCAR FECHAS)

## 📚 Funciones Disponibles

### Funciones Principales (Usar estas primero)

```typescript
import { 
  formatDateAuto,        // Fecha simple automática
  formatDateTimeAuto,    // Fecha y hora automática
  formatPrettyDate,      // Fecha "bonita" (PPP format)
  formatShortDate,       // Fecha corta (dd/MM/yy o MM/dd/yy)
  formatMediumDate,      // Fecha media (dd MMM yyyy o MMM dd, yyyy)
  formatMonthName,       // Nombre del mes según idioma
  formatCurrency,        // Moneda según idioma
  formatPaymentPeriod    // Períodos de pago automáticos
} from '@/lib/dateFormatting';
```

### Funciones Específicas de Contexto

```typescript
import {
  formatPaymentPeriodCompact,  // Períodos compactos
  formatPaymentPeriodBadge,    // Períodos para badges
  formatDeductionDate,         // Fechas de deducciones
  formatExpiryDate,           // Fechas de vencimiento
  getExpiryInfo               // Info completa de vencimiento
} from '@/lib/dateFormatting';
```

### Funciones Base (Solo si necesitas control específico)

```typescript
import {
  formatDateSafe,           // Función base con manejo de errores
  formatDateInUserTimeZone, // Para convertir Date a YYYY-MM-DD
  getTodayInUserTimeZone,   // Fecha actual en zona local
  getUserTimeZone          // Zona horaria del usuario
} from '@/lib/dateFormatting';
```

## ❌ NUNCA HACER (Patrones Prohibidos)

```typescript
// ❌ MAL - Hardcodear locales
format(date, 'dd/MM/yyyy', { locale: es })
format(date, 'PPP', { locale: es })
date.toLocaleDateString('es-ES')
amount.toLocaleString('es-US', { minimumFractionDigits: 2 })

// ❌ MAL - Causan problemas de zona horaria
format(new Date(dateFromDatabase), 'dd/MM/yyyy')
new Date(dateString).toISOString().split('T')[0]

// ❌ MAL - Formateo manual de moneda
`$${amount.toFixed(2)}`
amount.toLocaleString('es-US', { style: 'currency' })
```

## ✅ SIEMPRE HACER (Patrones Correctos)

```typescript
// ✅ BIEN - Usar funciones automáticas
formatDateAuto(dateFromDatabase)
formatPrettyDate(date)
formatCurrency(amount)
formatMonthName(date)

// ✅ BIEN - Para DatePickers
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
const { dateFormat, locale } = useLocalizedDate();

<DatePicker 
  dateFormat={dateFormat}
  locale={locale}
  // ...otros props
/>

// ✅ BIEN - Para casos especiales
import { useInternationalizedFormat } from '@/hooks/useInternationalizedFormat';
const { formatDateWithPattern } = useInternationalizedFormat();
formatDateWithPattern(date, 'dd MMM yyyy', 'MMM dd, yyyy')
```

## 🔧 Guía de Implementación para Nuevas Funcionalidades

### 1. Regla de Oro
**NUNCA uses `format()`, `toLocaleDateString()`, o `toLocaleString()` directamente**. Siempre usa las funciones centralizadas.

### 2. Para Nuevos Componentes

```typescript
// Al mostrar fechas
const displayDate = formatDateAuto(someDate);
const displayDateTime = formatDateTimeAuto(someDateTime);
const displayCurrency = formatCurrency(amount);

// Para DatePickers
import { useLocalizedDate } from '@/hooks/useLocalizedDate';
const { dateFormat, locale } = useLocalizedDate();
```

### 3. Para Nuevos Contextos Específicos

Si necesitas un formato específico recurrente, crea una función en `src/lib/dateFormatting.ts`:

```typescript
export const formatYourNewContext = (date: string | Date | null): string => {
  const language = getGlobalLanguage();
  const pattern = language === 'es' ? 'dd \'de\' MMMM' : 'MMMM dd';
  return formatDateSafe(date, pattern, { locale: language === 'es' ? es : enUS });
};
```

### 4. Lista de Verificación para Code Review

- [ ] ¿Se usan funciones centralizadas en lugar de `format()` directo?
- [ ] ¿Las fechas se muestran automáticamente según el idioma?
- [ ] ¿Las monedas usan `formatCurrency()` automático?
- [ ] ¿Los DatePickers usan `useLocalizedDate()`?
- [ ] ¿Se evitan hardcodes de locale español?
- [ ] ¿Se usa `formatDateInUserTimeZone()` para guardar fechas?

## 🎨 Ejemplos Completos

### Componente con Fechas y Monedas

```typescript
import React from 'react';
import { formatDateAuto, formatCurrency, formatPrettyDate } from '@/lib/dateFormatting';
import { useLocalizedDate } from '@/hooks/useLocalizedDate';

const PaymentCard = ({ payment }) => {
  const { dateFormat, locale } = useLocalizedDate();
  
  return (
    <div>
      {/* Fecha automática */}
      <p>Fecha: {formatDateAuto(payment.date)}</p>
      
      {/* Moneda automática */}
      <p>Monto: ${formatCurrency(payment.amount)}</p>
      
      {/* DatePicker con formato automático */}
      <DatePicker
        selected={selectedDate}
        onChange={setSelectedDate}
        dateFormat={dateFormat}
        locale={locale}
      />
    </div>
  );
};
```

### Filtros de Período

```typescript
import { formatPaymentPeriod, formatDateInUserTimeZone } from '@/lib/dateFormatting';

const PeriodFilter = () => {
  const createDateRange = (startDate: Date, endDate: Date) => ({
    startDate: formatDateInUserTimeZone(startDate), // Para API
    endDate: formatDateInUserTimeZone(endDate),     // Para API
    label: formatPaymentPeriod(startDate, endDate)  // Para UI
  });
};
```

## 🔄 Migraciones Futuras

### Si se Agrega un Nuevo Idioma

1. Actualizar `getGlobalLanguage()` en `src/lib/dateFormatting.ts`
2. Agregar locale en `useLocalizedDate.tsx`
3. Actualizar patrones en funciones específicas
4. Probar todos los componentes

### Si se Cambia la Librería de Fechas

1. Actualizar solo `src/utils/dateUtils.ts`
2. Las funciones de `src/lib/dateFormatting.ts` deben seguir igual
3. Todos los componentes seguirán funcionando sin cambios

## 🚨 Reglas Críticas

1. **NUNCA** usar `new Date()` directamente con fechas de BD
2. **SIEMPRE** usar funciones centralizadas
3. **PREFERIR** funciones específicas sobre genéricas
4. **TESTEAR** con ambos idiomas antes de hacer commit
5. **LEER** `src/IMPORTANT_DATE_RULES.md` antes de tocar fechas

## 📞 Soporte y Mantenimiento

- **Archivos críticos**: `src/lib/dateFormatting.ts`, `src/utils/dateUtils.ts`
- **Para bugs**: Revisar las funciones base primero
- **Para nuevos formatos**: Agregar en `dateFormatting.ts` siguiendo patrones existentes
- **Para dudas**: Consultar este documento y los archivos de reglas

## 🎯 Beneficios Logrados

✅ **Consistencia**: Mismo formato en toda la app
✅ **Automático**: Cambia según idioma sin código adicional  
✅ **Mantenible**: Cambios centralizados
✅ **Robusto**: Manejo de errores y casos edge
✅ **Escalable**: Fácil agregar nuevos idiomas
✅ **Performante**: Sin recálculos innecesarios

---

**Última actualización**: Diciembre 2024  
**Estado**: Implementación completa - 100% funcional  
**Próxima revisión**: Al agregar nuevas funcionalidades o idiomas