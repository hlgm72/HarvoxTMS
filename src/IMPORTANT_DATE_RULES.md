# 🚨 REGLAS CRÍTICAS PARA FECHAS - LEER ANTES DE TOCAR FECHAS

## ❌ NUNCA HACER:
```javascript
// ❌ MAL - Causa problemas de zona horaria
format(new Date(dateFromDatabase), 'dd/MM/yyyy')
dateObject.toISOString().split('T')[0]
new Date(dateString) // con fechas de base de datos
```

## ✅ SIEMPRE HACER:
```javascript
// ✅ BIEN - Usar funciones centralizadas
import { formatDateSafe, formatDateInUserTimeZone } from '@/lib/dateFormatting';

formatDateSafe(dateFromDatabase, 'dd/MM/yyyy')
formatDateInUserTimeZone(dateObject)
```

## 📁 Funciones disponibles:
- `formatDateSafe()` - Para formatear fechas de BD
- `formatDateInUserTimeZone()` - Para convertir Date a string 
- `formatPaymentPeriod()` - Para períodos de pago
- `formatDeductionDate()` - Para deducciones

## 🔍 Si encuentras código que usa `format(new Date())` o `toISOString().split()`:
1. ¡ES UN BUG! Debe ser corregido inmediatamente
2. Reemplazar con las funciones de `@/lib/dateFormatting`
3. Verificar que no hay problemas de zona horaria

Este archivo existe porque hemos tenido problemas recurrentes con fechas.
**TODO DESARROLLADOR DEBE LEER ESTO ANTES DE TOCAR FECHAS.**