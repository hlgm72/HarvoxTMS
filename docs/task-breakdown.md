# FleetNest TMS - Desglose de Tareas Específicas

## 🎯 **TAREA ACTUAL: FASE 1.2 - Autenticación Multi-Tenant**

### **Subtarea 1: Database Schema Multi-Tenant** ⏰ 30 min
```sql
-- Crear tablas base para multi-tenancy
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mc_number TEXT UNIQUE,
  dot_number TEXT UNIQUE,
  address JSONB,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  preferences JSONB DEFAULT '{}',
  last_active_company UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TYPE app_role AS ENUM ('owner', 'senior_dispatcher', 'dispatcher', 'driver');

CREATE TABLE user_company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  permissions JSONB DEFAULT '[]',
  delegated_by UUID REFERENCES auth.users(id),
  delegated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id, role)
);
```

### **Subtarea 2: RLS Policies** ⏰ 20 min
```sql
-- Companies table policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view companies they belong to" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Profiles table policies  
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- User company roles policies
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON user_company_roles
  FOR SELECT USING (auth.uid() = user_id);
```

### **Subtarea 3: Auth Pages** ⏰ 45 min
- ✅ **Login Page** - `/auth` con formulario email/password
- ✅ **Signup Page** - Registro + creación de primera empresa
- ✅ **Company Creation** - Formulario MC number, DOT, info básica
- ✅ **Auth State Management** - Hook para user/session/company

### **Subtarea 4: Company Switcher** ⏰ 30 min
- ✅ **Dropdown en Header** - Selector de empresa activa
- ✅ **Context Provider** - Estado global de empresa actual
- ✅ **Permissions Hook** - Verificar permisos por rol

### **Subtarea 5: Role-Based Navigation** ⏰ 20 min
- ✅ **Protected Routes** - Componente para verificar acceso
- ✅ **Dynamic Menu** - Items basados en rol de usuario
- ✅ **Permission Guards** - Hide/show features por rol

---

## 🎯 **SIGUIENTE TAREA: FASE 1.3 - Layout Command Center**

### **Subtarea 1: Sidebar with Navigation** ⏰ 30 min
- 🔲 **Collapsible Sidebar** - Con iconos y labels
- 🔲 **Menu Items** - Dashboard, Fleet, Loads, Drivers, Reports
- 🔲 **Active State** - Highlight current route
- 🔲 **Role Filtering** - Show/hide items by permissions

### **Subtarea 2: Main Content Area** ⏰ 20 min
- 🔲 **Responsive Layout** - Adjust to sidebar state
- 🔲 **Page Headers** - Title + actions per page
- 🔲 **Breadcrumbs** - Navigation context
- 🔲 **Loading States** - Skeleton components

### **Subtarea 3: Info Panel (Right)** ⏰ 25 min
- 🔲 **Contextual Info** - Based on current page
- 🔲 **Quick Actions** - Frequent tasks shortcut
- 🔲 **Notifications** - System alerts
- 🔲 **Collapsible** - Can hide on smaller screens

---

## 🎯 **DESPUÉS: FASE 1.4 - i18n Implementation**

### **Subtarea 1: i18n Setup** ⏰ 25 min
- 🔲 **react-i18next Config** - Initialization
- 🔲 **Language Files** - en/common.json, es/common.json
- 🔲 **Language Switcher** - Toggle EN/ES
- 🔲 **Browser Detection** - Default language

### **Subtarea 2: Translation Structure** ⏰ 30 min
```json
// locales/en/common.json
{
  "navigation": {
    "dashboard": "Dashboard",
    "fleet": "Fleet",
    "loads": "Loads",
    "drivers": "Drivers"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "fleet": {
    "vehicles": "Vehicles",
    "status": "Status",
    "active": "Active",
    "maintenance": "Maintenance"
  }
}
```

### **Subtarea 3: Component Translation** ⏰ 35 min
- 🔲 **Replace Hardcoded Text** - All components use t()
- 🔲 **Form Labels** - All inputs with translations
- 🔲 **Error Messages** - Localized error handling
- 🔲 **Date/Number Formatting** - Locale-specific

---

## 🎯 **FINALMENTE: FASE 1.5 - Fleet Management Basic**

### **Subtarea 1: Vehicles CRUD** ⏰ 40 min
- 🔲 **Vehicles Table** - List with search/filter
- 🔲 **Add Vehicle Form** - Modal with validation
- 🔲 **Edit Vehicle** - Update functionality
- 🔲 **Delete Vehicle** - With confirmation

### **Subtarea 2: Drivers CRUD** ⏰ 40 min
- 🔲 **Drivers Table** - Contact info, license
- 🔲 **Add Driver Form** - With photo upload
- 🔲 **License Tracking** - Expiration alerts
- 🔲 **Driver Assignments** - Link to vehicles

### **Subtarea 3: Fleet Dashboard** ⏰ 30 min
- 🔲 **KPI Cards** - Total vehicles, active, etc.
- 🔲 **Status Overview** - Visual fleet status
- 🔲 **Recent Activity** - Latest changes
- 🔲 **Quick Actions** - Add vehicle/driver buttons

---

## ⏱️ **ESTIMACIONES TOTALES**

### **Fase 1 Completa: ~6-8 horas**
- **1.2 Auth Multi-Tenant**: 2h 25min
- **1.3 Layout Command Center**: 1h 15min  
- **1.4 i18n Implementation**: 1h 30min
- **1.5 Fleet Management**: 1h 50min

### **Orden de Implementación:**
1. **Database Schema** → Base fundamental
2. **Auth System** → Security layer
3. **Layout Structure** → UI foundation
4. **i18n System** → Localization
5. **Fleet CRUD** → First business feature

---

## 🚀 **¿COMENZAMOS CON SUBTAREA 1?**

**Implementamos el Database Schema Multi-Tenant ahora mismo?**
- Creamos las tablas `companies`, `profiles`, `user_company_roles`
- Configuramos RLS policies para seguridad
- Preparamos base para autenticación

**Una vez aprobado, seguimos con Auth Pages y Company Switcher.**