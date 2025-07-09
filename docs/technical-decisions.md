# FleetNest TMS - Decisiones Técnicas

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript** - Framework principal
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Sistema de diseño
- **Shadcn/ui** - Componentes UI base
- **React Router DOM** - Navegación SPA
- **TanStack Query** - State management y cache

### Backend & Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos principal
- **Row Level Security (RLS)** - Seguridad multi-tenant
- **Supabase Auth** - Autenticación
- **Supabase Edge Functions** - Lógica de servidor

### Integraciones Planificadas
- **Geotab API** - GPS/ELD tracking (ya configurado)
- **QuickBooks** - Contabilidad
- **Google Maps** - Mapas y rutas
- **Stripe/Square** - Pagos
- **Email providers** - Notificaciones

## 🗄️ Arquitectura de Base de Datos

### Tablas Principales (Implementadas)
```sql
-- Gestión de vehículos
vehicles (id, geotab_id, name, vin, license_plate, make, model, year)
vehicle_positions (id, vehicle_id, lat, lng, speed, bearing, date_time)
vehicle_assignments (id, vehicle_id, driver_id, assigned_at, is_active)

-- Gestión de conductores  
drivers (id, geotab_id, name, license_number, phone, email)
```

### Tablas Multi-Tenant Planificadas
```sql
-- Multi-tenancy y usuarios
companies (id, name, mc_number, dot_number, address, logo_url, settings)
user_company_roles (user_id, company_id, role, permissions, delegated_by)
user_preferences (user_id, last_active_company, last_active_role, settings)

-- Core TMS
loads (id, company_id, load_number, pickup_date, delivery_date, rate, driver_id)
customers (id, company_id, name, mc_number, contact_info, payment_terms)
trucks (id, company_id, truck_number, vin, make, model, year, driver_id)
trailers (id, company_id, trailer_number, type, status)

-- Financiero
invoices (id, company_id, load_id, amount, status, sent_date, paid_date)
driver_payments (id, company_id, driver_id, week_ending, loads, deductions)
expenses (id, company_id, category, amount, date, truck_id, driver_id)

-- Documentos
documents (id, company_id, type, file_url, related_to_type, related_to_id)
fuel_purchases (id, company_id, driver_id, truck_id, gallons, amount, location)
```

## 🔐 Estrategia de Seguridad

### Row Level Security (RLS)
**Patrón Principal:**
```sql
-- Todas las tablas con company_id
CREATE POLICY "company_isolation" ON table_name
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid()
  )
);
```

### Roles y Permisos
```sql
-- Estructura de permisos granulares
user_company_roles: {
  user_id: uuid,
  company_id: uuid,
  role: enum['owner', 'senior_dispatcher', 'dispatcher', 'driver'],
  permissions: jsonb[], -- Array de permisos específicos
  delegated_by: uuid?, -- Si fue delegado por Owner
  delegated_at: timestamp?,
  is_active: boolean
}
```

### Service Role Policies
- **Geotab Sync** - Políticas para service_role pueden insertar/actualizar datos
- **Edge Functions** - Acceso controlado para integraciones

## 🎨 Sistema de Diseño

### Estructura CSS
**DECIDIDO: Template Command Center + Transport Orange**
```css
/* index.css - Sistema de tipografías seleccionado */
:root {
  --font-heading: 'Outfit', system-ui, sans-serif;    /* Headers - Moderno, tech */
  --font-body: 'Inter', system-ui, sans-serif;        /* Body - Ultra legible */
  --font-mono: 'JetBrains Mono', 'Consolas', monospace; /* Números, códigos TMS */
}

/* Paleta Command Center definitiva */
:root {
  --primary: [color-hsl];
  --secondary: [color-hsl]; 
  --accent: [color-hsl];
  --fleet-green: [color-hsl]; /* Color marca */
  --gradient-primary: linear-gradient(...);
  --shadow-elegant: [shadow];
}
```

### Componentes Adaptativos
- **Sidebar colapsible** - Desktop: expanded, Mobile: collapsed
- **Role-based navigation** - Menú dinámico según permisos
- **Company switcher** - Header/sidebar según espacio
- **Responsive breakpoints** - Mobile-first approach

## 🔄 Gestión de Estado

### Auth State
```typescript
// Estado global de autenticación
interface AuthState {
  user: User | null;
  session: Session | null;
  activeCompany: string | null;
  activeRole: string | null;
  availableCompanies: CompanyRole[];
}
```

### Multi-Role Management
```typescript
// Cambio de contexto
interface UserContext {
  switchRole: (role: string) => void;
  switchCompany: (companyId: string) => void;
  getPermissions: () => string[];
  canAccess: (permission: string) => boolean;
}
```

## 📱 Estrategia Responsive

### Breakpoints
- **Mobile:** < 768px - Sidebar collapsed, stack vertical
- **Tablet:** 768px - 1024px - Sidebar mini, layout híbrido  
- **Desktop:** > 1024px - Sidebar full, layout horizontal

### Componentes Móviles
- **Bottom navigation** para drivers
- **Swipe gestures** para cambio de contexto
- **Touch-optimized** controls y formularios

## 🔌 Integraciones

### Geotab (Implementado)
- **Edge Function** - `geotab-sync` para sincronización
- **Secrets configurados** - Database, username, password
- **Realtime updates** - Vehicle positions via Supabase realtime

### Futuras Integraciones
```typescript
// Estructura modular para integraciones
interface Integration {
  provider: string;
  enabled: boolean;
  companyId: string;
  config: Record<string, any>;
  lastSync: Date;
}
```

## 🚀 Estrategia de Deployment

### Desarrollo
- **Supabase local** - Desarrollo con migraciones
- **Vite dev server** - Hot reload
- **TypeScript strict** - Type safety

### Producción
- **Supabase hosting** - Database y backend
- **Lovable deployment** - Frontend automático
- **Custom domains** - Por compañía si requerido

## 📊 Performance

### Optimizaciones Planificadas
- **Query optimization** - Índices en company_id
- **Data pagination** - Para grandes flotas
- **Image optimization** - Logos y documentos
- **Code splitting** - Por roles y módulos
- **Realtime subscriptions** - Solo datos necesarios

## 🔧 Patrones de Desarrollo

### Componentes
```typescript
// Patrón de componente con permisos
interface ProtectedComponentProps {
  requiredPermission: string;
  children: ReactNode;
}
```

### Hooks Personalizados
```typescript
// Hooks para contexto multi-tenant
useActiveCompany() // Compañía actual
useUserRole() // Rol activo
usePermissions() // Permisos disponibles
useCompanyData() // Datos filtrados por compañía
```

### Error Handling
- **Boundary components** - Captura errores por módulo
- **Toast notifications** - Feedback inmediato
- **Logging estructurado** - Para debugging

---
*Última actualización: Enero 2025*