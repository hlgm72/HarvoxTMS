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

## 🧭 Flujo de Navegación Completo

### **Estructura de URLs**

#### **URLs Públicas** (Sin autenticación requerida)
- `fleetnest.app/` → Landing page principal
- `fleetnest.app/auth` → Login/Signup flows
- `fleetnest.app/demo` → Demo del producto (opcional)
- `fleetnest.app/pricing` → Planes y precios
- `fleetnest.app/contact` → Contacto y soporte

#### **URLs Protegidas** (Requieren autenticación)
- `fleetnest.app/dashboard` → Command Center principal
- `fleetnest.app/drivers` → Gestión de conductores
- `fleetnest.app/fleet` → Gestión de flota y vehículos
- `fleetnest.app/loads` → Gestión de cargas y rutas
- `fleetnest.app/clients` → Gestión de clientes/brokers
- `fleetnest.app/billing` → Facturación y pagos
- `fleetnest.app/reports` → Reportes y analytics
- `fleetnest.app/documents` → Gestión de documentos

### **Flujo de Autenticación**

#### **Landing Page Flow**
```
🌐 fleetnest.app → Landing Page
├── "Comenzar Gratis" → /auth?mode=signup
├── "Iniciar Sesión" → /auth?mode=login  
├── "Ver Demo" → /demo
└── Usuario autenticado → Auto-redirect /dashboard
```

#### **Authentication Flow**
```
📱 /auth
├── Login Tab:
│   ├── Email + Password
│   ├── "¿Olvidaste contraseña?" → Reset flow
│   └── Success → Company selection logic
├── Signup Tab:
│   ├── Personal info (Email, Password, Name)
│   ├── Company Creation:
│   │   ├── Company Name (requerido)
│   │   ├── MC Number (opcional)
│   │   ├── DOT Number (opcional)
│   │   └── Phone
│   └── Success → Auto-login + /dashboard
└── Post-Auth Logic:
    ├── Single Company → Auto-select + /dashboard
    ├── Multiple Companies → Company Switcher
    └── No Companies → /onboarding
```

### **Multi-Company Navigation**

#### **Company Selection Logic**
```
🏢 Company Context Management
├── Single Company:
│   ├── Auto-select company
│   ├── Set active company context
│   └── Navigate to /dashboard
├── Multiple Companies:
│   ├── Show Company Switcher dropdown
│   ├── Display role per company
│   ├── User selects company
│   ├── Context switch: Data + Permissions
│   └── Dashboard updates with company data
└── No Companies:
    ├── Redirect to /onboarding
    ├── Company creation wizard
    └── Complete → /dashboard
```

#### **Role-Based Navigation**
```
👤 Sidebar Navigation by Role

Owner/Senior Dispatcher:
├── ✅ Dashboard 📊 (KPIs, overview)
├── ✅ Drivers 👨‍✈️ (Gestión completa)
├── ✅ Fleet 🚛 (Vehículos, mantenimiento)
├── ✅ Loads 📦 (Cargas, rutas)
├── ✅ Clients 🏢 (Brokers, customers)
├── ✅ Billing 💰 (Facturación, pagos)
├── ✅ Reports 📋 (Todos los reportes)
├── ✅ Documents 📄 (BOLs, contratos)
└── ✅ Settings ⚙️ (Company, users)

Dispatcher:
├── ✅ Dashboard 📊 (Operativo)
├── ✅ Drivers 👨‍✈️ (Asignaciones)
├── ✅ Fleet 🚛 (Status, assignments)
├── ✅ Loads 📦 (Despacho, tracking)
├── ✅ Clients 🏢 (Contacto básico)
├── ❌ Billing 💰 (Acceso restringido)
├── ✅ Reports 📋 (Operativos únicamente)
├── ✅ Documents 📄 (Operativos)
└── ❌ Settings ⚙️ (Solo perfil personal)

Driver:
├── ✅ My Dashboard 📊 (Personal stats)
├── ✅ My Loads 📦 (Solo asignadas)
├── ✅ My Documents 📄 (BOLs, receipts)
├── ✅ Pay Statements 💰 (Historial pagos)
├── ❌ Fleet Management
├── ❌ Other Drivers
├── ❌ Company Settings
└── ❌ Financial Reports
```

### **Layout Structure**

#### **Main App Layout** (Post-Authentication)
```
🎯 Command Center Layout
├── Header (Fixed Top):
│   ├── Logo + "FleetNest Command Center"
│   ├── Company Switcher Dropdown
│   ├── Quick Actions:
│   │   ├── "Nueva Carga" (Primary)
│   │   └── "Despacho Rápido" (Emergency)
│   └── User Menu:
│       ├── Perfil
│       ├── Configuración
│       └── Cerrar Sesión
├── Sidebar (Collapsible):
│   ├── Company Info + Logo
│   ├── Role-based Navigation Menu
│   ├── Live Status Indicators
│   └── Collapse/Expand Toggle
├── Main Content Area:
│   ├── Breadcrumbs
│   ├── Page Header + Actions
│   ├── Content (Responsive)
│   └── Loading/Error States
└── Right Panel (Optional):
    ├── Contextual Information
    ├── Quick Actions
    ├── Notifications
    └── System Alerts
```

#### **Responsive Behavior**
```
📱 Mobile Navigation:
├── Header: Compact with hamburger menu
├── Sidebar: Drawer overlay (slide-in)
├── Company Switcher: Bottom sheet
├── Quick Actions: Floating action button
└── Right Panel: Hidden, accessible via menu

🖥️ Desktop Navigation:
├── Header: Full layout with all elements
├── Sidebar: Persistent, collapsible to icons
├── Company Switcher: Dropdown in header
├── Quick Actions: Header buttons
└── Right Panel: Contextual, collapsible
```

### **Navigation State Management**

#### **Route Protection Logic**
```typescript
// Authentication Guards
├── Public Routes: Landing, Auth, Demo
├── Protected Routes: Dashboard, Management
├── Role-based Guards: Permission checking
└── Company Context: Data isolation enforcement
```

#### **Context Switching**
```typescript
// Company Switch Flow
User selects different company →
├── Update active company context
├── Clear cached data
├── Refresh permissions
├── Update sidebar navigation
├── Reload dashboard data
└── Maintain current route if accessible
```

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