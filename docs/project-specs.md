# FleetNest TMS - Especificaciones del Proyecto

## 🎯 Visión General
**Aplicación web profesional tipo SaaS Multi-tenant** dirigida a compañías de transporte en EE.UU. Cada empresa tiene acceso seguro y aislado a sus datos (choferes, cargas, reportes, gastos, facturación).

## 🏗️ Arquitectura Multi-Tenant
- **Aislamiento por companyId** - Todos los documentos contienen campo `companyId`
- **Seguridad RLS** - Row Level Security para control de acceso
- **Escalabilidad** - Funcional para 2-100+ camiones por compañía

## 👥 Sistema de Roles y Permisos

### Roles Principales

#### **Superadmin** (Sistema Global)
- **Único rol global** - Control total del sistema
- **Único que puede eliminar compañías** (sujeto a análisis específico)
- Panel global para gestión de compañías
- Crear nuevas compañías, suspender, ver estadísticas

#### **Owner** (Por Compañía)
- **Dueño de la compañía** - Control total dentro de su empresa
- Puede delegar permisos a dispatchers de confianza
- Gestiona configuración de compañía, facturación, usuarios

#### **Senior Dispatcher** (Permisos Delegados)
- **Dispatcher con privilegios extendidos** delegados por Owner
- Puede gestionar operaciones diarias avanzadas
- NO puede cambiar configuración crítica de compañía

#### **Dispatcher** (Operativo)
- Gestiona cargas, choferes, reportes operativos
- Sin acceso a finanzas avanzadas o configuración

#### **Driver** (Limitado)
- Solo ve sus cargas asignadas
- Sube documentos (BOLs, recibos)
- Ve reportes de pago

### Roles Adicionales (Escalabilidad)
- `safety_manager` - Cumplimiento DOT, inspecciones
- `maintenance_manager` - Mantenimiento preventivo
- `accountant` - Facturación y reportes financieros
- `fuel_manager` - Gestión de combustible
- `load_planner` - Planificación de rutas

## 🔄 Casos de Uso Especiales

### 1. Multi-Role por Usuario
**Problema:** Owner pequeño también es driver
**Solución:** Role switching manual con recordar último rol usado
- Usuario puede tener múltiples roles asignados
- Rol activo determina permisos y UI
- Switcher en header para cambiar contexto

### 2. Dispatchers Independientes (Freelance)
**Problema:** Dispatcher trabaja para múltiples compañías
**Solución:** Acceso multi-company con niveles diferenciados
```javascript
user: {
  companyAssignments: [
    { companyId: "swift123", role: "senior_dispatcher" },
    { companyId: "prime456", role: "dispatcher" }
  ]
}
```
- **Facturación:** Cada compañía paga por separado su dispatcher
- **UX:** Company switcher prominente, dashboard agregado

### 3. Delegación de Permisos
**Problema:** Owner viaja/múltiples negocios, necesita delegar
**Solución:** Sistema de delegación controlada

#### Permisos NUNCA Delegables (Solo Owner):
- `delete_company` - Solo Superadmin
- `change_billing_info` - Datos financieros críticos  
- `manage_company_users` - Personal administrativo
- `change_company_settings` - MC#, DOT#, dirección legal
- `delegate_permissions` - Solo Owner puede delegar

#### Permisos Delegables:
- `approve_driver_payments`
- `manage_fuel_cards`
- `view_financial_reports`
- `manage_operational_drivers`

## 💰 Modelo de Facturación
- **Por compañía** - Cada empresa paga su suscripción
- **Dispatchers independientes** - Cada compañía paga por separado
- **Escalable** - Diferentes planes según tamaño de flota

## 🎨 Diseño y UX

### Elementos Clave
- **Company Selector** - Visible en header/sidebar
- **Role Switcher** - Manual, recuerda último rol usado
- **Responsive** - 100% adaptable móvil/desktop
- **Dark/Light Mode** - Soporte completo
- **Multi-idioma** - Inglés/Español (i18n)

### Navegación Dinámica
- **Sidebar adaptivo** por rol activo
- **Permisos granulares** por compañía
- **Breadcrumbs** para contexto

## 📱 Estrategia Mobile/Desktop

### **Command Center (Herramienta Principal)**
- ✅ **Responsive desde Fase 1** - Una sola codebase
- **Desktop**: Experiencia completa, multi-panel
- **Mobile**: UI simplificada, funciones críticas priorizadas
- **Usuarios**: Dispatchers, Owners, Managers

### **Driver Experience**
- 🎯 **Mobile-first desde Fase 1** - Optimizado para cabina/movimiento
- **Desktop**: Disponible Fase 3+ para paperwork en oficina
- **PWA**: Experiencia nativa con Capacitor (opcional)
- **Usuarios**: Drivers primariamente móvil

### **Ventajas Arquitectura Única**
- **Una codebase** - Mantenimiento eficiente
- **Consistencia** - Misma funcionalidad, UI adaptada
- **Despliegue único** - Updates instantáneos
- **Performance** - Optimización global

## 📱 Estrategia PWA (Fase 2+)

### **Enfoque: Una PWA con Experiencias Diferenciadas**
- **Manifest dinámico** por rol de usuario
- **Service Workers inteligentes** con caching por contexto
- **Experiencias optimizadas** según tipo de usuario
- **Install prompts** contextuales y personalizados

### **PWA Features por Usuario**

#### **Driver PWA Experience**
- 🔄 **Offline-first** - Funciona sin conexión
- 📷 **Camera access** - BOL scanning, documentación
- 📍 **Geolocation** - Live tracking, navegación
- 🔔 **Push notifications** - Nuevas cargas, alertas
- 🔄 **Background sync** - Upload automático al reconectar
- 🎯 **Quick actions** - Shortcuts para tareas frecuentes

#### **Command Center PWA Experience**
- ⚡ **Real-time updates** - WebSocket connections persistentes
- 🖥️ **Desktop notifications** - Alertas críticas del sistema
- 📁 **File handling** - Drag & drop documentos, bulk upload
- 🖨️ **Print API** - BOLs, reportes, documentación
- ⚡ **App shortcuts** - Quick dispatch, emergency actions
- 📊 **Offline dashboard** - KPIs cached para consulta sin conexión

### **Implementación Técnica**
- **Capacitor opcional** - Para features nativas avanzadas
- **Una codebase** - Shared components, diferente configuración
- **Caching estratégico** - Por rol y frecuencia de uso
- **Update strategy** - Background updates sin interrumpir workflow

### **Timeline PWA**
- **Fase 1**: Web app responsive, mobile-friendly
- **Fase 2**: PWA enhancement, service workers, offline support
- **Fase 3+**: Capacitor integration, native features avanzadas

## 📱 Tipos de Usuarios por Tamaño

### Compañía Pequeña (2-10 camiones)
```
├── 1 Owner (admin + dispatch + finanzas)
├── 2-3 Drivers
└── [roles opcionales deshabilitados]
```

### Compañía Mediana (11-50 camiones)
```
├── 1 Owner (estrategia + finanzas)
├── 2-3 Dispatchers (operaciones)
├── 1 Safety Manager
├── 15-20 Drivers
```

### Compañía Grande (50+ camiones)
```
├── 1 Owner
├── 5+ Dispatchers
├── 1 Fleet Manager
├── Roles especializados activos
├── 50+ Drivers
```

## 🔐 Seguridad y Aislamiento
- **RLS (Row Level Security)** en todas las tablas
- **Filtrado por companyId** automático
- **Auditoría** de acciones delegadas
- **Autenticación** por email/password + Google OAuth

## 📋 Módulos TMS Completos
1. **Gestión de Conductores** - Registro, licencias, pagos
2. **Gestión de Cargas** - Pickup, delivery, rates, asignación
3. **Gestión de Clientes/Brokers** - Contactos, historial
4. **Gestión de Equipos** - Trucks, trailers, mantenimiento
5. **Facturación** - Invoices, BOLs, cobros
6. **Pagos a Choferes** - Reportes semanales, deducciones
7. **Documentos** - BOLs, PODs, permisos
8. **Gastos y Finanzas** - Operativos, categorías
9. **Combustible** - Cargas, eficiencia, tarjetas
10. **IFTA y Millas** - Por estado, reportes trimestrales
11. **Dashboard** - KPIs, alertas, gráficas
12. **Integración GPS/ELD** - Tiempo real, HOS
13. **App Móvil Driver** - Cargas, documentos, pagos
14. **Mensajería** - Comunicación, notificaciones
15. **Reportes** - Financieros, operativos, exportación

## 🎯 Objetivos de Experiencia
- **Profesional** - UI moderna, confiable
- **Escalable** - 2 camiones → 100+ camiones
- **Flexible** - Múltiples casos de uso
- **Seguro** - Aislamiento total de datos
- **Eficiente** - Flujos optimizados por rol

---
*Última actualización: Enero 2025*