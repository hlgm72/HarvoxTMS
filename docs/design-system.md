# FleetNest TMS - Design System de Componentes

## 🎨 **Decisiones de Diseño Confirmadas**

### **Template Seleccionado:** Command Center
- **Layout:** 3 columnas (Sidebar + Main + Info Panel)
- **Paleta:** Transport Orange (#FF6B35) + Blue (#2563EB)
- **Modo:** Claro/Oscuro desde el inicio
- **Mobile:** App específica para drivers

### **Tipografía Seleccionada:** Inter + Outfit + JetBrains Mono
- **Headings:** Outfit (moderno, tech-friendly)
- **Body:** Inter (ultra legible, optimizada UI)
- **Data/Mono:** JetBrains Mono (números, códigos TMS)

---

## 📋 **SISTEMA DE FORMULARIOS**

### **Estilo Principal: Floating Labels + Icons**
```tsx
// Estilo unificado en toda la app
const FormField = () => (
  <div className="relative group">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
      <TruckIcon className="h-5 w-5" />
    </div>
    <input 
      className="pl-12 pr-4 py-3 bg-background border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      placeholder=" " 
    />
    <label className="absolute left-12 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none group-focus-within:top-2 group-focus-within:text-xs group-focus-within:text-primary peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-xs">
      Truck Number
    </label>
  </div>
);
```

### **Iconos por Contexto TMS:**
```tsx
const FORM_ICONS = {
  // Flota y vehículos
  truck: TruckIcon,
  driver: UserIcon,
  trailer: RectangleHorizontalIcon,
  
  // Cargas y logística  
  load: PackageIcon,
  pickup: MapPinIcon,
  delivery: FlagIcon,
  route: RouteIcon,
  
  // Financiero
  rate: DollarSignIcon,
  payment: CreditCardIcon,
  invoice: FileTextIcon,
  
  // Contacto y comunicación
  phone: PhoneIcon,
  email: MailIcon,
  company: BuildingIcon,
  
  // Documentos
  document: FileIcon,
  camera: CameraIcon,
  upload: UploadIcon,
  
  // Fechas y tiempo
  date: CalendarIcon,
  time: ClockIcon,
  datetime: CalendarClockIcon,
};
```

### **Estados de Validación:**
```tsx
// Sistema unificado de validación visual
const ValidationStates = {
  default: "border-border focus:border-primary",
  error: "border-destructive focus:border-destructive focus:ring-destructive/20",
  success: "border-green-500 focus:border-green-500 focus:ring-green-500/20",
  warning: "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500/20",
};
```

---

## 📊 **SISTEMA DE TABLAS**

### **Estilo Unificado: Modern Data Table**
```tsx
const FleetTable = () => (
  <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
    {/* Header con actions */}
    <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
      <h3 className="font-heading font-semibold">Fleet Status</h3>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <FilterIcon className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Truck
        </Button>
      </div>
    </div>
    
    {/* Table */}
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30">
          <TableHead className="font-heading font-medium">Truck #</TableHead>
          <TableHead className="font-heading font-medium">Driver</TableHead>
          <TableHead className="font-heading font-medium">Status</TableHead>
          <TableHead className="font-heading font-medium">Location</TableHead>
          <TableHead className="text-right font-heading font-medium">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="hover:bg-muted/50 transition-colors">
          <TableCell className="font-mono font-semibold text-primary">TRK-001</TableCell>
          <TableCell className="font-body">John Smith</TableCell>
          <TableCell>
            <StatusBadge status="active" />
          </TableCell>
          <TableCell className="font-body text-muted-foreground">Chicago, IL</TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);
```

### **Características de Tablas TMS:**
- **Headers con iconos** - Contexto visual inmediato
- **Datos monospace** - Truck numbers, load IDs alineados
- **Status badges** - Estados visuales consistentes
- **Hover effects** - Feedback interactivo
- **Actions dropdown** - Acciones contextuales
- **Responsive** - Stack en mobile

---

## 🎴 **SISTEMA DE TARJETAS (CARDS)**

### **Card Styles por Contexto:**

#### **1. KPI Cards (Dashboard)**
```tsx
const KPICard = ({ title, value, icon, trend }) => (
  <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body text-sm text-muted-foreground">{title}</p>
          <p className="font-mono text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="font-body text-sm text-green-600 flex items-center mt-1">
              <TrendingUpIcon className="h-4 w-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-full">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);
```

#### **2. Load Cards (Operations)**
```tsx
const LoadCard = ({ load }) => (
  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="font-heading text-lg">
          Load #{load.number}
        </CardTitle>
        <StatusBadge status={load.status} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-body text-sm">{load.pickup}</span>
        </div>
        <div className="flex items-center gap-2">
          <FlagIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-body text-sm">{load.delivery}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="font-body text-sm text-muted-foreground">Rate:</span>
          <span className="font-mono font-semibold text-lg text-green-600">
            ${load.rate}
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);
```

#### **3. Driver Cards (Mobile)**
```tsx
const DriverMobileCard = ({ driver }) => (
  <Card className="touch-friendly p-6 shadow-lg">
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={driver.avatar} />
        <AvatarFallback className="font-heading text-lg">
          {driver.initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-heading font-semibold text-lg">{driver.name}</h3>
        <p className="font-body text-muted-foreground">{driver.currentLocation}</p>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={driver.status} />
          <span className="font-mono text-sm">TRK-{driver.truckNumber}</span>
        </div>
      </div>
    </div>
  </Card>
);
```

---

## 🏷️ **SISTEMA DE BADGES Y ESTADOS**

### **Status Badges Unificados:**
```tsx
const StatusBadge = ({ status }) => {
  const variants = {
    active: "bg-green-100 text-green-800 border-green-200",
    inactive: "bg-gray-100 text-gray-800 border-gray-200", 
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
    loading: "bg-blue-100 text-blue-800 border-blue-200",
    // TMS específicos
    "in-transit": "bg-blue-100 text-blue-800 border-blue-200",
    "delivered": "bg-green-100 text-green-800 border-green-200",
    "delayed": "bg-red-100 text-red-800 border-red-200",
    "scheduled": "bg-purple-100 text-purple-800 border-purple-200",
  };
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
      variants[status]
    )}>
      <div className="w-2 h-2 rounded-full bg-current opacity-60" />
      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
    </span>
  );
};
```

---

## 🎯 **GUIDELINES DE CONSISTENCIA**

### **Reglas Universales:**
1. **Iconos SIEMPRE a la izquierda** de labels en forms
2. **Datos monospace** para números, códigos, IDs
3. **Headers con font-heading** para jerarquía visual
4. **Hover effects** en elementos interactivos
5. **Status colors** consistentes en toda la app
6. **Touch targets** mínimo 44px en mobile
7. **4px border-radius** por defecto, 8px para cards

### **Spacing System:**
```css
/* Espaciado consistente */
--space-xs: 0.25rem;  /* 4px */
--space-sm: 0.5rem;   /* 8px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
```

### **Animation Guidelines:**
```css
/* Transiciones estándar */
--transition-fast: 150ms ease-out;
--transition-base: 200ms ease-out;
--transition-slow: 300ms ease-out;
```

### **Component Hierarchy:**
```
Form Fields:
  Icon (left) + Floating Label + Input + Validation State

Tables:
  Header (title + actions) + Table (headers + rows) + Pagination

Cards:
  Header (title + status) + Content + Actions (optional)

Mobile Cards:
  Avatar/Icon + Content + Status + Actions
```

---

## 📱 **RESPONSIVE BEHAVIOR**

### **Breakpoint Strategy:**
- **Mobile (< 768px):** Stack vertical, bottom navigation
- **Tablet (768-1024px):** Hybrid layout, collapsed sidebar
- **Desktop (> 1024px):** Full 3-column layout

### **Touch Targets:**
- **Minimum 44px** for all interactive elements
- **8px spacing** between touch targets
- **Large buttons** in mobile driver app
- **Swipe gestures** for navigation

### **Typography Scaling:**
```css
/* Responsive font sizes */
.font-heading { 
  @apply text-lg md:text-xl lg:text-2xl;
}
.font-body { 
  @apply text-sm md:text-base;
}
.font-mono { 
  @apply text-xs md:text-sm;
}
```

---

*Última actualización: Enero 2025*