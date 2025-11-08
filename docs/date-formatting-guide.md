# Guía para Formateo de Fechas en Harvox

## 🎯 Objetivo

Este documento explica cómo manejar fechas de manera consistente en toda la aplicación para evitar problemas de zona horaria y formateo inconsistente.

## ❌ Problema Común

Las fechas que vienen de la base de datos a menudo se ven afectadas por conversiones de zona horaria cuando usamos:
```javascript
// ❌ EVITAR - Causa problemas de zona horaria
format(new Date(dateFromDatabase), 'dd/MM/yyyy')
```

## ✅ Solución

Usar las funciones centralizadas del módulo `@/lib/dateFormatting`:

```javascript
import { formatDateOnly, formatPaymentPeriod, formatDateTime } from '@/lib/dateFormatting';

// ✅ CORRECTO - Maneja zona horaria correctamente
formatDateOnly(dateFromDatabase)
```

## 📚 Funciones Disponibles

### Funciones Básicas

```javascript
import { 
  formatDateOnly,     // Para fechas simples (dd/MM/yyyy)
  formatDateTime,     // Para fecha y hora (dd/MM/yyyy HH:mm)
  formatDatabaseDate, // Específicamente para fechas de BD
  formatDateSafe      // Función base con manejo de errores
} from '@/lib/dateFormatting';
```

### Funciones Específicas de Contexto

```javascript
import { 
  formatPaymentPeriod,  // Para períodos de pago
  formatDeductionDate,  // Para fechas de deducciones
  formatExpiryDate      // Para fechas de vencimiento
} from '@/lib/dateFormatting';
```

## 🔧 Casos de Uso

### 1. Fechas de Deducciones
```javascript
// ❌ Antes
format(new Date(deduction.expense_date), 'dd/MM/yyyy', { locale: es })

// ✅ Ahora
formatDeductionDate(deduction.expense_date)
```

### 2. Períodos de Pago
```javascript
// ❌ Antes
{format(new Date(period.start_date), 'dd/MM/yyyy')} - {format(new Date(period.end_date), 'dd/MM/yyyy')}

// ✅ Ahora
formatPaymentPeriod(period.start_date, period.end_date)
```

### 3. Fechas de Documentos
```javascript
// ❌ Antes
format(new Date(document.expires_at), 'dd/MM/yyyy')

// ✅ Ahora
formatExpiryDate(document.expires_at)
```

## 🛠️ Migración de Código Existente

Para migrar código existente:

1. **Identificar** uso de `format` con fechas de BD
2. **Reemplazar** imports:
   ```javascript
   // Cambiar esto:
   import { format } from "date-fns";
   import { es } from "date-fns/locale";
   
   // Por esto:
   import { formatDateOnly, formatDateTime } from '@/lib/dateFormatting';
   ```

3. **Actualizar** llamadas a función:
   ```javascript
   // Cambiar esto:
   format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
   
   // Por esto:
   formatDateOnly(dateString)
   ```

## 🔍 Patrones Comunes

### Fechas Nulas o Undefined
```javascript
// Las funciones manejan automáticamente valores nulos
formatDateOnly(null)          // → 'No definida'
formatDateOnly(undefined)     // → 'No definida'
formatDateOnly('')            // → 'No definida'
```

### Fechas Inválidas
```javascript
formatDateOnly('fecha-invalida')  // → 'Fecha inválida'
formatDateOnly('2023-99-99')      // → 'Fecha inválida'
```

### Fechas ISO vs Fechas Puras
```javascript
// La función detecta automáticamente el formato
formatDateOnly('2023-12-25')           // ✅ Fecha pura (sin zona horaria)
formatDateOnly('2023-12-25T10:30:00Z') // ✅ Fecha ISO (con zona horaria)
```

## 📝 Reglas de Oro

1. **Nunca** usar `new Date()` directamente con fechas de BD
2. **Siempre** usar las funciones centralizadas de `@/lib/dateFormatting`
3. **Preferir** funciones específicas (`formatPaymentPeriod`) sobre genéricas
4. **Testear** con diferentes zonas horarias si es posible

## 🎯 Beneficios

- ✅ Consistencia en toda la aplicación
- ✅ Manejo automático de zona horaria
- ✅ Gestión de errores centralizada
- ✅ Fácil mantenimiento y actualización
- ✅ Reducción de bugs relacionados con fechas

## 📞 Soporte

Si encuentras problemas con fechas o necesitas una nueva función específica, actualiza este archivo y las funciones en `@/utils/dateUtils.ts` y `@/lib/dateFormatting.ts`.