# Sistema de Gestión de Pagos y Gastos de Conductores

## Resumen de Requerimientos Analizados

Este documento recoge las decisiones tomadas durante el análisis de requerimientos para el sistema de gestión de pagos y gastos de conductores en FleetNest.

## Contexto del Negocio

- **Frecuencia de pago**: Los pagos a conductores se realizan semanalmente (estándar en >95% de la industria)
- **Tipos de conductores**: Company Drivers y Owner Operators
- **Complejidad**: Los gastos tienen diferentes características de frecuencia, montos y aplicación

## Tipos de Gastos Identificados

### 1. Gastos Recurrentes
- **Frecuencias soportadas**:
  - Semanales
  - Quincenales (bi-weekly)
  - Mensuales (con especificación de semana del mes para aplicar)

- **Características**:
  - Monto fijo que puede cambiar en el tiempo
  - Fechas de inicio y fin de validez
  - Historial de cambios de montos

### 2. Gastos Eventuales
- Surgen esporádicamente
- Monto específico para la ocasión
- Fecha exacta del gasto

### 3. Gastos con Priorización
- **Críticos**: Siempre se aplican (ej. seguros obligatorios)
- **Normales**: Se aplican según disponibilidad de balance
- **Diferibles**: Pueden moverse a períodos futuros

## Flujo de Procesamiento

### 1. Cálculo Automático
```
Ingresos Totales = Ingresos por Cargas + Otros Ingresos
Balance Inicial = Ingresos Totales
```

### 2. Aplicación de Deducciones
1. Aplicar gastos críticos primero
2. Aplicar gastos normales por prioridad
3. Si el balance se vuelve negativo → **ALERTA**

### 3. Gestión de Balance Negativo
**Decisión clave**: Cuando el balance queda negativo, el sistema solo alerta y permite decisión manual del admin/dispatcher sobre:
- Qué deducciones aplicar
- Qué deducciones diferir 
- Monto final a pagar al conductor

### 4. Gastos Pendientes
- Gastos que no pudieron aplicarse van a lista de "Pendientes"
- Admin/dispatcher recibe alertas de gastos pendientes
- Pueden aplicarse manualmente en períodos futuros

## Estructura de Base de Datos

### Tablas Principales

#### `expense_types`
Categorización de tipos de gastos comunes en la industria:
- Fuel Cards
- Insurance Deduction  
- Phone/Communication
- ELD/Tracking Device
- Truck Payment
- Maintenance Reserve
- Tolls
- Permits & Licenses
- etc.

#### `recurring_expense_templates`
Plantillas para gastos recurrentes:
- Configuración de frecuencia
- Monto base
- Fechas de validez
- Semana del mes (para gastos mensuales)

#### `payment_periods`
Períodos de pago semanales:
- Fechas del período
- Ingresos totales
- Deducciones totales
- Balance neto
- Estado del período (draft, calculated, approved, paid)
- **Campos de alerta**: `has_negative_balance`, `balance_alert_message`

#### `expense_instances`
Instancias específicas de gastos en cada período:
- Link a plantilla recurrente (si aplica)
- Monto específico
- Estado (planned, applied, deferred, cancelled)
- Prioridad y criticidad

#### `pending_expenses`
Cola de gastos diferidos:
- Referencia al gasto original
- Período donde se aplicará finalmente
- Razón del diferimiento

#### `expense_template_history`
Historial de cambios en montos de plantillas recurrentes.

## Características del Sistema

### Alertas y Notificaciones
- **Balance negativo**: Alerta visual clara cuando las deducciones exceden ingresos
- **Gastos pendientes**: Notificaciones al admin/dispatcher
- **Cambios de plantillas**: Tracking de modificaciones en gastos recurrentes

### Control Manual
- Admin/dispatcher tiene control final sobre aplicación de gastos
- Flexibilidad para decidir monto final de pago
- Capacidad de diferir gastos a períodos futuros

### Seguridad y Permisos
- RLS implementado para todos los datos
- Conductores ven solo sus propios datos
- Company members pueden gestionar datos de su compañía
- Historial completo de cambios y aprobaciones

## Estructura Actualizada de Base de Datos (2025-01-10)

### Cambios Implementados en payment_periods:
- **Renombrado**: `week_start_date` → `period_start_date`, `week_end_date` → `period_end_date`
- **Nuevos campos**:
  - `period_type`: 'regular', 'special', 'bonus' (permite períodos eventuales)
  - `period_frequency`: 'weekly', 'biweekly', 'monthly', 'custom'

### Configuración por Compañía (companies):
- **`default_payment_frequency`**: Configuración base de la compañía
- **`payment_cycle_start_day`**: Día de inicio del ciclo (1=Lunes, 2=Martes, etc.)

## Próximos Pasos de Implementación

### Fase 1: Configuración de Períodos por Compañía (1-2 horas)
1. **Pantalla de Configuración**: 
   - Formulario para establecer `default_payment_frequency`
   - Selector de `payment_cycle_start_day`
   - Validaciones y preview de períodos

2. **Hook de Configuración**:
   ```typescript
   useCompanyPaymentConfig() // Gestiona configuración de períodos
   ```

### Fase 2: Gestión de Períodos Flexibles (2-3 horas)
1. **Componente PaymentPeriodManager**:
   - Lista de períodos regulares y especiales
   - Botón "Crear Período Especial" para bonos/ajustes
   - Indicadores visuales por tipo de período

2. **Modal de Período Especial**:
   - Fechas customizables
   - Tipo: special/bonus
   - Razón del período especial

### Fase 3: Motor de Cálculo Automático (3-4 horas)
1. **Función de Generación Automática**:
   ```typescript
   generatePaymentPeriods(companyId, fromDate, toDate)
   ```

2. **Aplicación de Gastos por Prioridad**:
   - Gastos críticos primero
   - Manejo de balance negativo
   - Diferimiento automático de gastos no críticos

### Fase 4: Interfaz de Usuario Completa (2-3 horas)
1. **Dashboard de Períodos**: Vista general con alertas
2. **Sistema de Alertas**: Notificaciones para balances negativos
3. **Reportes**: Análisis de pagos y gastos por período

## Casos de Uso Principales

1. **Configurar gasto recurrente**: Admin configura plantilla para seguro mensual de $150
2. **Procesar período semanal**: Sistema calcula automáticamente gastos aplicables
3. **Manejar balance negativo**: Sistema alerta y permite decisión manual
4. **Diferir gastos**: Mover gastos no críticos a siguiente período
5. **Aprobar pagos**: Admin revisa y aprueba montos finales

---

*Documento creado el 2025-01-10 basado en conversaciones de análisis de requerimientos*