# Harvox TMS - Sistema de Internacionalización (i18n)

## 🌍 **Estrategia i18n: Bilingüe desde el Día 1**

### **Principio Fundamental:**
**TODA página, componente, formulario, tabla, mensaje de error, etc. se implementa AUTOMÁTICAMENTE en inglés y español desde el primer día.** No existe funcionalidad que sea monolingüe.

### **Decisión Arquitectónica:**
- **Inglés como base** - Desarrollo primario en inglés
- **Español simultáneo** - Traducción paralela obligatoria
- **Detección automática** - Sistema detecta idioma preferido del navegador
- **Persistencia** - Recuerda elección del usuario
- **Escalabilidad** - Estructura preparada para idiomas futuros

---

## 📚 **Implementación Técnica**

### **Librería Seleccionada: react-i18next**
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**Configuración Básica:**
```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en', // Inglés por defecto
    fallbackLng: 'en',
    
    // Namespaces por módulo TMS
    ns: ['common', 'dashboard', 'fleet', 'drivers', 'loads', 'finance', 'errors'],
    defaultNS: 'common',
    
    // Configuración
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    // Recursos se cargan dinámicamente
    resources: {
      en: {
        common: () => import('./locales/en/common.json'),
        dashboard: () => import('./locales/en/dashboard.json'),
        // ... más namespaces
      },
      es: {
        common: () => import('./locales/es/common.json'),
        dashboard: () => import('./locales/es/dashboard.json'),
        // ... más namespaces
      }
    }
  });
```

---

## 📁 **Estructura de Archivos de Traducción**

### **Organización por Módulos TMS:**
```
src/i18n/
├── locales/
│   ├── en/ (English - Base)
│   │   ├── common.json           # Navigation, buttons, actions
│   │   ├── dashboard.json        # Command center específico
│   │   ├── fleet.json           # Fleet management
│   │   ├── drivers.json         # Driver management
│   │   ├── loads.json           # Loads & logistics
│   │   ├── finance.json         # Billing, payments, invoicing
│   │   ├── reports.json         # Analytics and reporting
│   │   ├── documents.json       # Document management
│   │   ├── maintenance.json     # Vehicle maintenance
│   │   ├── compliance.json      # DOT, IFTA, safety
│   │   ├── errors.json          # Error messages
│   │   └── validation.json      # Form validation messages
│   │
│   └── es/ (Español - Paralelo)
│       ├── common.json          # Navegación, botones, acciones
│       ├── dashboard.json       # Centro de comando específico
│       ├── fleet.json          # Gestión de flota
│       ├── drivers.json        # Gestión de conductores
│       ├── loads.json          # Cargas y logística
│       ├── finance.json        # Facturación, pagos
│       ├── reports.json        # Análisis y reportes
│       ├── documents.json      # Gestión de documentos
│       ├── maintenance.json    # Mantenimiento de vehículos
│       ├── compliance.json     # DOT, IFTA, seguridad
│       ├── errors.json         # Mensajes de error
│       └── validation.json     # Mensajes de validación
```

---

## 📝 **Ejemplos de Traducción TMS Específica**

### **common.json (Navegación y Acciones Universales)**

**English (en/common.json):**
```json
{
  "app": {
    "name": "Harvox",
    "tagline": "Command Center for Transportation"
  },
  "navigation": {
    "dashboard": "Command Center",
    "fleet": "Fleet",
    "drivers": "Drivers",
    "loads": "Loads", 
    "finance": "Finance",
    "reports": "Reports",
    "documents": "Documents",
    "settings": "Settings"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "assign": "Assign",
    "unassign": "Unassign",
    "view_details": "View Details",
    "add_new": "Add New",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print",
    "refresh": "Refresh"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "in_progress": "In Progress"
  }
}
```

**Español (es/common.json):**
```json
{
  "app": {
    "name": "Harvox",
    "tagline": "Centro de Comando para Transporte"
  },
  "navigation": {
    "dashboard": "Centro de Comando",
    "fleet": "Flota",
    "drivers": "Conductores",
    "loads": "Cargas",
    "finance": "Finanzas",
    "reports": "Reportes",
    "documents": "Documentos", 
    "settings": "Configuración"
  },
  "actions": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "edit": "Editar", 
    "delete": "Eliminar",
    "assign": "Asignar",
    "unassign": "Desasignar",
    "view_details": "Ver Detalles",
    "add_new": "Agregar Nuevo",
    "search": "Buscar",
    "filter": "Filtrar",
    "export": "Exportar",
    "print": "Imprimir",
    "refresh": "Actualizar"
  },
  "status": {
    "active": "Activo",
    "inactive": "Inactivo", 
    "pending": "Pendiente",
    "completed": "Completado",
    "cancelled": "Cancelado",
    "in_progress": "En Progreso"
  }
}
```

### **fleet.json (Gestión de Flota Específica)**

**English (en/fleet.json):**
```json
{
  "titles": {
    "fleet_overview": "Fleet Overview",
    "vehicle_details": "Vehicle Details",
    "maintenance_schedule": "Maintenance Schedule"
  },
  "vehicle": {
    "truck_number": "Truck Number",
    "vin": "VIN",
    "make": "Make",
    "model": "Model",
    "year": "Year",
    "license_plate": "License Plate",
    "current_driver": "Current Driver",
    "last_location": "Last Known Location",
    "mileage": "Mileage",
    "fuel_level": "Fuel Level"
  },
  "status": {
    "available": "Available",
    "in_transit": "In Transit",
    "out_of_service": "Out of Service",
    "maintenance": "In Maintenance",
    "inspection_due": "Inspection Due"
  },
  "metrics": {
    "total_vehicles": "Total Vehicles",
    "active_vehicles": "Active Vehicles",
    "vehicles_in_transit": "Vehicles in Transit",
    "maintenance_required": "Maintenance Required"
  }
}
```

**Español (es/fleet.json):**
```json
{
  "titles": {
    "fleet_overview": "Resumen de Flota",
    "vehicle_details": "Detalles del Vehículo", 
    "maintenance_schedule": "Cronograma de Mantenimiento"
  },
  "vehicle": {
    "truck_number": "Número de Camión",
    "vin": "VIN",
    "make": "Marca",
    "model": "Modelo", 
    "year": "Año",
    "license_plate": "Placa",
    "current_driver": "Conductor Actual",
    "last_location": "Última Ubicación Conocida",
    "mileage": "Millaje",
    "fuel_level": "Nivel de Combustible"
  },
  "status": {
    "available": "Disponible",
    "in_transit": "En Tránsito",
    "out_of_service": "Fuera de Servicio",
    "maintenance": "En Mantenimiento", 
    "inspection_due": "Inspección Vencida"
  },
  "metrics": {
    "total_vehicles": "Total de Vehículos",
    "active_vehicles": "Vehículos Activos",
    "vehicles_in_transit": "Vehículos en Tránsito",
    "maintenance_required": "Mantenimiento Requerido"
  }
}
```

---

## 🔧 **Implementación en Componentes**

### **Regla Absoluta: Sin Hardcoded Text**
```tsx
// ❌ INCORRECTO - Texto hardcoded
const FleetDashboard = () => (
  <div>
    <h1>Fleet Overview</h1>
    <Button>Add Truck</Button>
  </div>
);

// ✅ CORRECTO - Siempre usando i18n
import { useTranslation } from 'react-i18next';

const FleetDashboard = () => {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <div>
      <h1 className="font-heading text-2xl">
        {t('fleet:titles.fleet_overview')}
      </h1>
      <Button>
        {t('common:actions.add_new')} {t('fleet:vehicle.truck_number')}
      </Button>
    </div>
  );
};
```

### **Interpolación con Variables:**
```tsx
// Con conteos y variables
const FleetStats = ({ vehicleCount, activeCount }) => {
  const { t } = useTranslation('fleet');
  
  return (
    <div>
      <p>{t('metrics.total_vehicles')}: {vehicleCount}</p>
      <p>{t('metrics.active_vehicles')}: {activeCount}</p>
      
      {/* Con interpolación */}
      <p>{t('status_message', { 
        total: vehicleCount, 
        active: activeCount 
      })}</p>
    </div>
  );
};
```

### **Pluralización Automática:**
```json
// En archivos de traducción
{
  "truck_count": "{{count}} truck",
  "truck_count_plural": "{{count}} trucks",
  "truck_count_zero": "No trucks"
}
```

```tsx
// En componente
<p>{t('truck_count', { count: truckCount })}</p>
// Automáticamente: "1 truck" / "5 trucks" / "No trucks"
```

---

## 🎨 **Language Switcher UI**

### **Header Component con Switcher:**
```tsx
const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation('common');
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <GlobeIcon className="h-4 w-4" />
          <span className="font-mono text-xs">
            {i18n.language.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={i18n.language === 'en' ? 'bg-primary/10' : ''}
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('es')}
          className={i18n.language === 'es' ? 'bg-primary/10' : ''}
        >
          <span className="mr-2">🇪🇸</span>
          Español
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

## 📱 **Consideraciones Mobile Driver App**

### **Cambio Rápido de Idioma:**
```tsx
// En mobile - toggle simple y rápido
const MobileLanguageToggle = () => {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleLanguage}
      className="w-16"
    >
      {i18n.language === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
    </Button>
  );
};
```

### **Notificaciones Push Bilingües:**
```typescript
// Sistema de notificaciones respeta idioma del usuario
const sendNotification = (userId: string, messageKey: string, variables?: any) => {
  const userLanguage = getUserLanguage(userId); // 'en' | 'es'
  const message = t(messageKey, { lng: userLanguage, ...variables });
  
  // Envía notificación en el idioma correcto
  pushNotification(userId, message);
};
```

---

## 🌐 **Escalabilidad Futura**

### **Idiomas Adicionales Planeados:**
```typescript
// Estructura preparada para expansión
const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸', region: 'US' },
  es: { name: 'Español', flag: '🇪🇸', region: 'ES/MX' },
  // Futuros:
  'pt-BR': { name: 'Português', flag: '🇧🇷', region: 'Brazil' },
  'fr-CA': { name: 'Français', flag: '🇨🇦', region: 'Canada' },
  de: { name: 'Deutsch', flag: '🇩🇪', region: 'Germany' }
};
```

### **Contexto Regional TMS:**
- **Mexican Spanish** - Términos específicos de transporte México-US
- **Canadian French** - Regulaciones Transport Canada
- **Brazilian Portuguese** - Mercado de logística Brasil

---

## ⚙️ **Workflow de Desarrollo**

### **Regla de Implementación:**
1. **Desarrollar en inglés** - Crear funcionalidad con keys i18n
2. **Traducir inmediatamente** - Agregar traducción española antes de commit
3. **Validar ambos idiomas** - Testing en ambos idiomas obligatorio
4. **Documentar nuevas keys** - Actualizar archivos de traducción

### **Estructura de Development:**
```typescript
// Hook personalizado para validar traducciones
const useTranslationValidation = () => {
  const { t, i18n } = useTranslation();
  
  const validateKey = (key: string) => {
    const enTranslation = t(key, { lng: 'en' });
    const esTranslation = t(key, { lng: 'es' });
    
    if (enTranslation === key || esTranslation === key) {
      console.warn(`Missing translation for key: ${key}`);
    }
  };
  
  return { validateKey };
};
```

---

## 🎯 **Implementación Automática Garantizada**

### **Compromiso de Calidad:**
- ✅ **Cada nueva página** → Bilingüe desde el primer commit
- ✅ **Cada nuevo formulario** → Labels y mensajes en ambos idiomas
- ✅ **Cada nueva tabla** → Headers y contenido traducido
- ✅ **Cada nuevo modal/dialog** → Títulos y botones bilingües
- ✅ **Cada mensaje de error** → Descriptivo en inglés y español
- ✅ **Cada notificación** → Contexto apropiado por idioma

### **Testing Automatizado:**
```typescript
// Tests automáticos para validar traducciones
describe('i18n Coverage', () => {
  it('should have Spanish translation for every English key', () => {
    const englishKeys = getTranslationKeys('en');
    const spanishKeys = getTranslationKeys('es');
    
    englishKeys.forEach(key => {
      expect(spanishKeys).toContain(key);
    });
  });
});
```

---

*Última actualización: Enero 2025*