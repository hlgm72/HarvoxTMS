# Sistema de Rastreo de Equipos

## Visión General

El sistema de rastreo de equipos permite monitorear la ubicación y estado de los vehículos de la flota en tiempo real utilizando dos enfoques principales:

1. **Integración con Geotab** - Para flotas que ya tienen dispositivos telemáticos
2. **GPS Móvil de Conductores** - Alternativa económica usando smartphones

## 1. Integración con Geotab

### Funcionalidades Implementadas

#### 1.1 Vinculación de Equipos
- **GeotabLinkDialog**: Modal para vincular equipos con vehículos Geotab
- **useGeotabVehicles**: Hook para gestionar la vinculación
- Validación de vehículos disponibles
- Prevención de vinculaciones duplicadas

#### 1.2 Visualización de Estado
- **EquipmentLocationStatus**: Componente que muestra:
  - Estado de vinculación (No vinculado, Vinculado, Sin datos)
  - Información del vehículo Geotab
  - Última actualización de ubicación
  - Velocidad actual y odómetro
  - Botón para ver en Google Maps

#### 1.3 Mapa de Ubicaciones
- **EquipmentLocationMap**: Vista de mapa con todas las ubicaciones
- Integración con Google Maps
- Marcadores personalizados por tipo de equipo
- InfoWindows con detalles del equipo

#### 1.4 Datos en Tiempo Real
- Sincronización automática con Geotab
- Almacenamiento de posiciones históricas
- Edge function para sincronización programada

### Base de Datos - Geotab

```sql
-- Vehículos de Geotab
geotab_vehicles (
  id, geotab_id, name, make, model, year, 
  vin, license_plate, device_serial_number
)

-- Posiciones GPS de vehículos
geotab_vehicle_positions (
  id, vehicle_id, latitude, longitude, 
  speed, bearing, odometer, engine_hours, 
  date_time, geotab_device_id
)

-- Asignaciones conductor-vehículo
geotab_vehicle_assignments (
  id, driver_id, vehicle_id, assigned_at, is_active
)

-- Vinculación equipo-vehículo Geotab
company_equipment.geotab_vehicle_id
```

## 2. GPS Móvil de Conductores

### Funcionalidades Propuestas

#### 2.1 Aplicación Móvil del Conductor

**Tecnología**: Capacitor + React
**Características**:
- Login seguro del conductor
- Selección de equipo asignado
- Control de turno (Iniciar/Terminar)
- Tracking GPS automático
- Modo offline con sincronización
- Notificaciones push

**Pantallas Principales**:
```
├── Login
├── Dashboard del Conductor
│   ├── Equipo Asignado
│   ├── Estado del Turno
│   └── Información de Ruta
├── Selección de Equipo
├── Configuración
└── Historial de Turnos
```

#### 2.2 Sistema de Tracking

**Configuración GPS**:
- Intervalo de reporte: 30 segundos (configurable)
- Precisión mínima: 10 metros
- Filtrado de posiciones inválidas
- Detección de paradas prolongadas
- Optimización de batería

**Lógica de Negocio**:
- Solo trackear durante turnos activos
- Asociación automática conductor-equipo
- Detección de movimiento vs. parada
- Cálculo automático de kilometraje
- Alertas por velocidad excesiva

#### 2.3 Dashboard Web de Monitoreo

**Vista en Tiempo Real**:
- Mapa interactivo con todos los equipos
- Filtros por estado, conductor, tipo de equipo
- Panel de alertas y notificaciones
- Métricas de rendimiento en vivo

**Funcionalidades del Mapa**:
- Marcadores en tiempo real
- Rutas históricas
- Zonas geográficas (geofencing)
- Clustering de vehículos cercanos
- Controles de zoom y capas

### Base de Datos - GPS Móvil

```sql
-- Turnos de conductores
driver_shifts (
  id, driver_user_id, equipment_id, 
  start_time, end_time, status,
  total_distance, total_duration
)

-- Ubicaciones GPS de conductores
driver_locations (
  id, driver_user_id, equipment_id, shift_id,
  latitude, longitude, altitude, accuracy,
  speed, heading, timestamp, 
  is_moving, address
)

-- Asignaciones conductor-equipo
driver_equipment_assignments (
  id, driver_user_id, equipment_id,
  assigned_date, unassigned_date,
  assignment_type, is_active
)

-- Alertas de tracking
tracking_alerts (
  id, driver_user_id, equipment_id,
  alert_type, message, severity,
  latitude, longitude, created_at, resolved_at
)
```

## 3. Arquitectura Técnica

### 3.1 Frontend (Web)
```
src/
├── components/equipment/
│   ├── GeotabLinkDialog.tsx ✅
│   ├── EquipmentLocationStatus.tsx ✅
│   ├── EquipmentLocationMap.tsx ✅
│   ├── DriverTrackingMap.tsx ⏳
│   ├── RealTimeFleetDashboard.tsx ⏳
│   └── TrackingAlertsPanel.tsx ⏳
├── hooks/
│   ├── useGeotabVehicles.tsx ✅
│   ├── useDriverTracking.tsx ⏳
│   ├── useRealTimeLocations.tsx ⏳
│   └── useTrackingAlerts.tsx ⏳
└── pages/
    ├── DriverMobile/ ⏳
    └── FleetTracking.tsx ⏳
```

### 3.2 Backend (Edge Functions)
```
supabase/functions/
├── geotab-sync/ ✅
├── driver-location-update/ ⏳
├── tracking-alerts/ ⏳
├── shift-management/ ⏳
└── fleet-reports/ ⏳
```

### 3.3 Aplicación Móvil
```
mobile/
├── src/pages/
│   ├── Login.tsx ⏳
│   ├── DriverDashboard.tsx ⏳
│   ├── EquipmentSelection.tsx ⏳
│   └── ShiftHistory.tsx ⏳
├── src/services/
│   ├── LocationService.ts ⏳
│   ├── SyncService.ts ⏳
│   └── NotificationService.ts ⏳
└── capacitor.config.ts ⏳
```

## 4. Funcionalidades Avanzadas

### 4.1 Reportes y Analytics
- Reportes de kilometraje por conductor/equipo
- Análisis de rutas más eficientes
- Tiempo de inactividad por equipo
- Consumo de combustible estimado
- Métricas de productividad del conductor

### 4.2 Alertas y Notificaciones
- Velocidad excesiva
- Desviación de ruta planificada
- Paradas no autorizadas
- Entrada/salida de zonas específicas
- Mantenimiento basado en kilometraje

### 4.3 Integración con Sistemas Externos
- API para sistemas de dispatch
- Webhooks para alertas críticas
- Exportación de datos a Excel/PDF
- Integración con sistemas de combustible
- API para apps de terceros

## 5. Consideraciones de Implementación

### 5.1 Privacidad y Seguridad
- Consentimiento explícito del conductor
- Tracking solo durante horas laborales
- Encriptación de datos de ubicación
- Políticas de retención de datos
- Cumplimiento con regulaciones locales

### 5.2 Rendimiento y Escalabilidad
- Optimización de consultas de ubicación
- Índices geoespaciales en base de datos
- Caché de ubicaciones frecuentes
- Compresión de datos históricos
- Rate limiting en APIs

### 5.3 Experiencia de Usuario
- Interfaz intuitiva en móvil
- Notificaciones no intrusivas
- Modo offline robusto
- Sincronización transparente
- Feedback visual de estado

## 6. Roadmap de Desarrollo

### Fase 1: Fundación Mobile (4-6 semanas)
- Configuración de Capacitor
- App móvil básica del conductor
- Sistema de tracking GPS
- Backend para recibir ubicaciones

### Fase 2: Dashboard Web (3-4 semanas)
- Mapa de flota en tiempo real
- Panel de control de turnos
- Alertas básicas
- Reportes simples

### Fase 3: Funcionalidades Avanzadas (6-8 semanas)
- Geofencing
- Alertas inteligentes
- Reportes avanzados
- Optimización de rutas

### Fase 4: Integración y Pulido (2-3 semanas)
- Integración con sistemas existentes
- Optimización de rendimiento
- Testing y QA
- Documentación final

## 7. Métricas de Éxito

- **Precisión de ubicación**: >95% dentro de 10 metros
- **Tiempo de actualización**: <60 segundos
- **Uptime del sistema**: >99.5%
- **Adopción por conductores**: >90%
- **Reducción de costos operativos**: >15%
- **Mejora en eficiencia de rutas**: >20%