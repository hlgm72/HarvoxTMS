# FleetNest TMS - Arquitectura de Componentes Reutilizables

## 🧩 **Estrategia de Componentes: Automática y Escalable**

### **Principio Fundamental:**
**CERO duplicación de código. Cualquier elemento que aparezca más de una vez se convierte inmediatamente en componente reutilizable con variants y props configurables.**

---

## 📁 **Estructura de Organización Automática**

### **Jerarquía de Componentes:**
```
src/components/
├── ui/                          # Componentes base (shadcn + customizados)
│   ├── button.tsx              # Base button con variants
│   ├── card.tsx                # Base card layouts
│   ├── table.tsx               # Base table components
│   └── ...                     # Otros componentes shadcn
│
├── forms/                       # Componentes de formularios reutilizables
│   ├── FormField.tsx           # Floating label + icon universal
│   ├── TruckNumberInput.tsx    # Input específico para truck numbers
│   ├── DateTimeField.tsx       # Date/time picker con formato TMS
│   ├── AddressField.tsx        # Dirección con autocomplete
│   ├── MoneyField.tsx          # Amounts con formato currency
│   └── ValidationMessage.tsx   # Mensajes de error consistentes
│
├── data/                        # Componentes de datos reutilizables
│   ├── DataTable.tsx           # Tabla con actions, filters, pagination
│   ├── StatusBadge.tsx         # Badges de estado TMS
│   ├── KPICard.tsx             # Cards de métricas dashboard
│   ├── LoadCard.tsx            # Cards específicas de cargas
│   ├── DriverCard.tsx          # Cards de conductores
│   └── VehicleCard.tsx         # Cards de vehículos
│
├── navigation/                  # Navegación reutilizable
│   ├── Sidebar.tsx             # Sidebar principal con roles
│   ├── Header.tsx              # Header con company/role switchers
│   ├── Breadcrumbs.tsx         # Navegación de contexto
│   └── TabNavigation.tsx       # Tabs reutilizables
│
├── layout/                      # Layouts y wrappers
│   ├── PageLayout.tsx          # Layout base para páginas
│   ├── DashboardLayout.tsx     # Layout específico dashboard
│   ├── MobileLayout.tsx        # Layout para drivers mobile
│   └── ModalLayout.tsx         # Modals consistentes
│
├── tms/                         # Componentes específicos TMS
│   ├── TruckDisplay.tsx        # Mostrar info de truck consistente
│   ├── DriverProfile.tsx       # Perfil de conductor reutilizable
│   ├── LoadSummary.tsx         # Resumen de carga
│   ├── RouteMap.tsx            # Mapa de rutas
│   ├── DocumentUpload.tsx      # Upload de BOLs, documentos
│   └── DistanceCalculator.tsx  # Cálculos de distancia/tiempo
│
├── business/                    # Lógica de negocio reutilizable
│   ├── PaymentCalculator.tsx   # Cálculos de pagos
│   ├── FuelTracker.tsx         # Tracking de combustible
│   ├── ComplianceChecker.tsx   # Validaciones DOT/IFTA
│   └── ReportGenerator.tsx     # Generación de reportes
│
└── shared/                      # Utilidades compartidas
    ├── LoadingSpinner.tsx      # Loading states consistentes
    ├── EmptyState.tsx          # Estados vacíos con iconos
    ├── ErrorBoundary.tsx       # Error handling
    ├── ConfirmDialog.tsx       # Confirmaciones consistentes
    └── NotificationBanner.tsx  # Notificaciones app-wide
```

---

## 🔧 **Componentes Base Reutilizables Automáticos**

### **1. FormField Universal**
```tsx
// src/components/forms/FormField.tsx
interface FormFieldProps {
  label: string;
  icon?: LucideIcon;
  type?: 'text' | 'email' | 'tel' | 'number';
  validation?: 'error' | 'success' | 'warning';
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  icon: Icon,
  type = 'text',
  validation,
  required,
  ...props
}) => {
  const { t } = useTranslation('common');
  
  return (
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <input 
        className={cn(
          "w-full pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 transition-all",
          Icon ? "pl-12" : "pl-4",
          validation === 'error' && "border-destructive focus:border-destructive",
          validation === 'success' && "border-green-500 focus:border-green-500",
          validation === 'warning' && "border-yellow-500 focus:border-yellow-500",
          !validation && "border-border focus:border-primary"
        )}
        type={type}
        placeholder=" "
        required={required}
        {...props}
      />
      <label className={cn(
        "absolute top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none",
        "group-focus-within:top-2 group-focus-within:text-xs group-focus-within:text-primary",
        "peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs",
        Icon ? "left-12" : "left-4"
      )}>
        {t(label)} {required && <span className="text-destructive">*</span>}
      </label>
    </div>
  );
};
```

### **2. StatusBadge Universal**
```tsx
// src/components/data/StatusBadge.tsx
interface StatusBadgeProps {
  status: TMSStatus;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
  showIcon?: boolean;
}

type TMSStatus = 
  | 'active' | 'inactive' | 'warning' | 'error' | 'loading'
  | 'in-transit' | 'delivered' | 'delayed' | 'scheduled'
  | 'available' | 'assigned' | 'maintenance' | 'inspection-due';

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  variant = 'default',
  showIcon = true 
}) => {
  const { t } = useTranslation('common');
  
  const statusConfig = {
    active: { color: 'green', icon: CheckCircleIcon },
    inactive: { color: 'gray', icon: MinusCircleIcon },
    'in-transit': { color: 'blue', icon: TruckIcon },
    delivered: { color: 'green', icon: CheckIcon },
    delayed: { color: 'red', icon: AlertTriangleIcon },
    // ... más configuraciones
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full text-xs font-medium border",
      size === 'sm' && "px-2 py-0.5",
      size === 'md' && "px-2.5 py-1", 
      size === 'lg' && "px-3 py-1.5 text-sm",
      `bg-${config.color}-100 text-${config.color}-800 border-${config.color}-200`
    )}>
      {showIcon && (
        <Icon className={cn(
          size === 'sm' && "h-3 w-3",
          size === 'md' && "h-4 w-4",
          size === 'lg' && "h-5 w-5"
        )} />
      )}
      {t(`status.${status}`)}
    </span>
  );
};
```

### **3. DataTable Universal**
```tsx
// src/components/data/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  title?: string;
  actions?: React.ReactNode;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  selectable?: boolean;
  onRowSelect?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const DataTable = <T,>({
  data,
  columns, 
  title,
  actions,
  searchable = true,
  filterable = true,
  pagination = true,
  ...props
}: DataTableProps<T>) => {
  const { t } = useTranslation(['common', 'table']);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Header con título y acciones */}
      {(title || actions || searchable) && (
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-4">
            {title && (
              <h3 className="font-heading font-semibold text-lg">{t(title)}</h3>
            )}
            {searchable && (
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t('actions.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {filterable && (
              <Button variant="outline" size="sm">
                <FilterIcon className="h-4 w-4 mr-2" />
                {t('actions.filter')}
              </Button>
            )}
            {actions}
          </div>
        </div>
      )}
      
      {/* Tabla con react-table */}
      <Table>
        {/* Headers, Body, etc. implementados */}
      </Table>
      
      {/* Pagination si está habilitada */}
      {pagination && <TablePagination />}
    </div>
  );
};
```

---

## 🎯 **Hooks Reutilizables Automáticos**

### **Hooks TMS Específicos:**
```tsx
// src/hooks/useTruckData.ts
const useTruckData = (truckId?: string) => {
  const { data: trucks, loading, error } = useQuery({
    queryKey: ['trucks', truckId],
    queryFn: () => truckId ? getTruck(truckId) : getTrucks(),
  });
  
  return { trucks, loading, error };
};

// src/hooks/useDriverAssignment.ts
const useDriverAssignment = () => {
  const assignDriver = useMutation({
    mutationFn: ({ truckId, driverId }) => assignDriverToTruck(truckId, driverId),
    onSuccess: () => queryClient.invalidateQueries(['trucks']),
  });
  
  return { assignDriver };
};

// src/hooks/useLoadTracking.ts
const useLoadTracking = (loadId: string) => {
  const { data: tracking } = useQuery({
    queryKey: ['load-tracking', loadId],
    queryFn: () => getLoadTracking(loadId),
    refetchInterval: 30000, // Actualiza cada 30 segundos
  });
  
  return { tracking };
};

// src/hooks/usePermissions.ts
const usePermissions = () => {
  const { activeRole, activeCompany } = useAuth();
  
  const canAccess = useCallback((permission: string) => {
    return checkPermission(activeRole, permission);
  }, [activeRole]);
  
  const canManage = useCallback((resource: string) => {
    return canAccess(`manage_${resource}`);
  }, [canAccess]);
  
  return { canAccess, canManage };
};
```

---

## 🎨 **Composición de Componentes Automática**

### **Ejemplo: Fleet Dashboard Page**
```tsx
// src/pages/FleetDashboard.tsx - Composición automática
const FleetDashboard = () => {
  const { t } = useTranslation(['common', 'fleet']);
  const { trucks, loading } = useTruckData();
  const { canManage } = usePermissions();
  
  return (
    <PageLayout 
      title={t('fleet:titles.fleet_overview')}
      breadcrumbs={[
        { label: t('navigation.dashboard'), href: '/' },
        { label: t('navigation.fleet'), href: '/fleet' }
      ]}
    >
      {/* KPI Cards Row - Automáticamente responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <KPICard 
          title={t('fleet:metrics.total_vehicles')}
          value={trucks?.length || 0}
          icon={<TruckIcon />}
          trend="+2 this month"
        />
        <KPICard 
          title={t('fleet:metrics.active_vehicles')}
          value={trucks?.filter(t => t.status === 'active').length || 0}
          icon={<CheckCircleIcon />}
          variant="success"
        />
        {/* Más KPI cards... */}
      </div>
      
      {/* Data Table - Reutilizable y configurable */}
      <DataTable
        data={trucks || []}
        columns={fleetTableColumns}
        title="fleet:titles.fleet_status"
        searchable
        filterable
        actions={
          canManage('fleet') && (
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('actions.add_new')} {t('fleet:vehicle.truck_number')}
            </Button>
          )
        }
        onRowClick={(truck) => navigate(`/fleet/${truck.id}`)}
        loading={loading}
      />
    </PageLayout>
  );
};
```

---

## ⚡ **Optimización Automática**

### **Code Splitting por Módulos:**
```tsx
// Lazy loading automático por secciones
const FleetModule = lazy(() => import('./fleet/FleetModule'));
const DriversModule = lazy(() => import('./drivers/DriversModule'));
const LoadsModule = lazy(() => import('./loads/LoadsModule'));

// Preloading estratégico
const preloadModule = (moduleName: string) => {
  import(`./modules/${moduleName}`);
};
```

### **Memoización Inteligente:**
```tsx
// Componentes que dependen de props complejas se memoizan automáticamente
const KPICard = memo(({ title, value, icon, trend }) => {
  // Implementación
}, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value && 
         prevProps.trend === nextProps.trend;
});
```

---

## 🔄 **Actualización Automática del Design System**

### **Propagación de Cambios:**
Cuando cambio un componente base:
1. **Automáticamente actualiza** todas las instancias
2. **Mantiene variants** específicas intactas
3. **Preserva customizaciones** locales necesarias
4. **TypeScript valida** que los cambios no rompan nada

### **Ejemplo de Evolución:**
```tsx
// Si necesito agregar una nueva variant al StatusBadge:
// 1. Agrego el tipo: 'maintenance-urgent'
// 2. Agrego la configuración: color 'orange', icon WrenchIcon
// 3. AUTOMÁTICAMENTE disponible en toda la app
// 4. Traducciones se agregan automáticamente

<StatusBadge status="maintenance-urgent" />
// Renders: 🔧 Mantenimiento Urgente (en español)
// Renders: 🔧 Urgent Maintenance (en inglés)
```

---

## 🎯 **Garantías de Reutilización**

### **Compromiso Automático:**
- ✅ **Cero duplicación** - Si existe el componente, se reutiliza
- ✅ **Variants automáticas** - Props configurables para todos los casos
- ✅ **Consistencia visual** - Design system aplicado automáticamente  
- ✅ **Accesibilidad** - Keyboard navigation, screen readers
- ✅ **Responsive** - Mobile/desktop handling automático
- ✅ **i18n** - Bilingüe en todos los componentes
- ✅ **Performance** - Lazy loading y memoización inteligente

### **Resultado:**
**Cada nueva página/feature que implemente reutilizará automáticamente componentes existentes, mantendrá consistencia visual absoluta, y será inmediatamente bilingüe y responsive.**

---

*Última actualización: Enero 2025*