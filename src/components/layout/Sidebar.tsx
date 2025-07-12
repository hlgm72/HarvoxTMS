import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, Command, Users, Truck, Package, MapPin, Building2, 
  CreditCard, BarChart3, FileText, Target, Activity, Shield, 
  Heart, TrendingUp, Headphones, Settings, FileBarChart, 
  Lock, Home, Navigation, Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useDriversCount } from "@/hooks/useDriversCount";
import { useUserCompanies } from "@/hooks/useUserCompanies";

// Navegación para Company Owner
const getCompanyOwnerNavigationItems = (driversCount: number) => [
  // Dashboard
  { 
    title: "Dashboard Ejecutivo", 
    url: "/dashboard/owner", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel ejecutivo",
    section: "dashboard"
  },
  
  // Gestión Operacional
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: driversCount.toString(),
    badgeVariant: "count" as const,
    description: "Gestión de conductores",
    section: "operations"
  },
  { 
    title: "Flota", 
    url: "/equipment", 
    icon: Truck, 
    badge: "42",
    badgeVariant: "count" as const,
    description: "Vehículos y equipos",
    section: "operations"
  },
  { 
    title: "Cargas", 
    url: "/loads", 
    icon: Package, 
    badge: "24",
    badgeVariant: "count" as const,
    description: "Gestión de cargas",
    section: "operations"
  },
  
  // Gestión Comercial
  { 
    title: "Clientes", 
    url: "/clients", 
    icon: Building2,
    description: "Base de clientes",
    section: "commercial"
  },
  { 
    title: "Facturación", 
    url: "/billing", 
    icon: CreditCard,
    description: "Facturación y pagos",
    section: "commercial"
  },
  
  // Reportes y Análisis
  { 
    title: "Reportes Financieros", 
    url: "/reports/financial", 
    icon: BarChart3,
    description: "Análisis financiero",
    section: "reports"
  },
  
  // Administración
  { 
    title: "Gestión de Usuarios", 
    url: "/users", 
    icon: Users, 
    description: "Usuarios y roles",
    section: "admin"
  },
  { 
    title: "Configuración", 
    url: "/settings", 
    icon: Settings,
    description: "Configuración de empresa",
    section: "admin"
  },
];

// Navegación para Operations Manager  
const getOperationsManagerNavigationItems = (driversCount: number) => [
  // Dashboard y Supervisión
  { 
    title: "Dashboard Operacional", 
    url: "/dashboard/operations", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel operacional",
    section: "dashboard"
  },
  { 
    title: "Supervisión", 
    url: "/supervision", 
    icon: Activity, 
    description: "Supervisión de equipos",
    section: "dashboard"
  },
  
  // Gestión Operacional
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: driversCount.toString(),
    badgeVariant: "count" as const,
    description: "Gestión de conductores",
    section: "operations"
  },
  { 
    title: "Flota", 
    url: "/equipment", 
    icon: Truck, 
    badge: "42",
    badgeVariant: "count" as const,
    description: "Vehículos y equipos",
    section: "operations"
  },
  { 
    title: "Cargas", 
    url: "/loads", 
    icon: Package, 
    badge: "24",
    badgeVariant: "count" as const,
    description: "Gestión de cargas",
    section: "operations"
  },
  { 
    title: "Rutas", 
    url: "/routes", 
    icon: Navigation,
    description: "Planificación de rutas",
    section: "operations"
  },
  
  // Reportes
  { 
    title: "Reportes", 
    url: "/reports", 
    icon: BarChart3,
    description: "Reportes operacionales",
    section: "reports"
  },
];

// Navegación para Dispatcher
const getDispatcherNavigationItems = (driversCount: number) => [
  // Dashboard y Seguimiento
  { 
    title: "Dashboard", 
    url: "/dashboard/dispatch", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel de despacho",
    section: "dashboard"
  },
  { 
    title: "Seguimiento", 
    url: "/tracking", 
    icon: MapPin,
    description: "Seguimiento en tiempo real",
    section: "dashboard"
  },
  
  // Gestión de Cargas
  { 
    title: "Cargas Activas", 
    url: "/loads/active", 
    icon: Package, 
    badge: "12",
    badgeVariant: "count" as const,
    description: "Cargas en progreso",
    section: "loads"
  },
  { 
    title: "Asignar Cargas", 
    url: "/loads/assign", 
    icon: Navigation,
    description: "Asignación de cargas",
    section: "loads"
  },
  
  // Recursos
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: driversCount.toString(),
    badgeVariant: "count" as const,
    description: "Estado de conductores",
    section: "resources"
  },
  { 
    title: "Documentos", 
    url: "/documents", 
    icon: FileText,
    description: "Documentación",
    section: "resources"
  },
];

// Navegación para Driver
const getDriverNavigationItems = () => [
  // Panel Personal
  { 
    title: "Mi Dashboard", 
    url: "/dashboard/driver", 
    icon: Home, 
    description: "Panel personal",
    section: "dashboard"
  },
  
  // Mis Tareas
  { 
    title: "Mis Cargas", 
    url: "/my-loads", 
    icon: Package, 
    badge: "3",
    badgeVariant: "count" as const,
    description: "Cargas asignadas",
    section: "tasks"
  },
  { 
    title: "Mis Documentos", 
    url: "/my-documents", 
    icon: FileText,
    description: "Documentos personales",
    section: "tasks"
  },
  
  // Financiero
  { 
    title: "Pagos", 
    url: "/payments", 
    icon: CreditCard,
    description: "Historial de pagos",
    section: "financial"
  },
];

// Función para obtener navegación traducida del superadmin
const getSuperAdminNavigationItems = (t: any) => [
  // Sección Principal
  { 
    title: t('admin:navigation.dashboard'), 
    url: "/superadmin", 
    icon: Command, 
    badge: "Admin",
    badgeVariant: "admin" as const,
    description: t('admin:navigation.admin_panel'),
    section: "main"
  },
  { 
    title: t('admin:navigation.companies'), 
    url: "/superadmin/companies", 
    icon: Building2,
    description: t('admin:navigation.company_management'),
    section: "main"
  },
  { 
    title: t('admin:navigation.users'), 
    url: "/superadmin/users", 
    icon: Users,
    description: t('admin:navigation.system_users'),
    section: "main"
  },
  
  // Sección Monitoreo
  { 
    title: t('admin:navigation.system_health'), 
    url: "/superadmin/health", 
    icon: Heart, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: t('admin:navigation.system_status'),
    section: "monitoring"
  },
  { 
    title: t('admin:navigation.analytics'), 
    url: "/superadmin/analytics", 
    icon: TrendingUp,
    description: t('admin:navigation.system_analytics'),
    section: "monitoring"
  },
  { 
    title: t('admin:navigation.api_logs'), 
    url: "/superadmin/logs", 
    icon: FileBarChart,
    description: t('admin:navigation.api_logs_desc'),
    section: "monitoring"
  },
  
  // Sección Facturación y Soporte
  { 
    title: t('admin:navigation.billing_management'), 
    url: "/superadmin/billing", 
    icon: CreditCard,
    description: t('admin:navigation.billing_management_desc'),
    section: "business"
  },
  { 
    title: t('admin:navigation.support_tickets'), 
    url: "/superadmin/support", 
    icon: Headphones,
    description: t('admin:navigation.support_management'),
    section: "business"
  },
  
  // Sección Configuración y Seguridad
  { 
    title: t('admin:navigation.system_settings'), 
    url: "/superadmin/settings", 
    icon: Settings,
    description: t('admin:navigation.system_configuration'),
    section: "settings"
  },
  { 
    title: t('admin:navigation.backup_security'), 
    url: "/superadmin/security", 
    icon: Lock,
    description: t('admin:navigation.security_backups'),
    section: "settings"
  },
];

export function AppSidebar() {
  const { t } = useTranslation(['admin', 'common']);
  const { state } = useSidebar();
  const { 
    isSuperAdmin, 
    isCompanyOwner, 
    isOperationsManager, 
    isDispatcher, 
    isDriver,
    currentRole,
    _forceUpdate
  } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const { companies, selectedCompany, setSelectedCompany, loading } = useUserCompanies();
  const { driversCount } = useDriversCount();
  
  const collapsed = state === "collapsed";
  
  // Determinar navegación según el rol del usuario
  const getNavigationItems = () => {
    if (isSuperAdmin) return getSuperAdminNavigationItems(t);
    if (isCompanyOwner) return getCompanyOwnerNavigationItems(driversCount);
    if (isOperationsManager) return getOperationsManagerNavigationItems(driversCount);
    if (isDispatcher) return getDispatcherNavigationItems(driversCount);
    if (isDriver) return getDriverNavigationItems();
    
    // Fallback para usuarios sin rol específico
    return getDispatcherNavigationItems(driversCount);
  };
  
  const navigationItems = getNavigationItems();

  const isActive = (path: string) => currentPath === path;
  
  const getBadgeStyles = (variant?: 'live' | 'count' | 'admin') => {
    switch (variant) {
      case 'live':
        return "bg-fleet-green text-white animate-pulse shadow-sm border border-fleet-green/30";
      case 'admin':
        return "bg-fleet-orange text-white border border-fleet-orange/30";
      case 'count':
        return "bg-primary-glow/20 text-primary-glow border border-primary-glow/40";
      default:
        return "bg-white/20 text-white/80 border border-white/30";
    }
  };

  // Función para obtener mapeo de secciones según el rol
  const getSectionLabels = () => {
    if (isCompanyOwner) {
      return {
        dashboard: "Dashboard",
        operations: "Gestión Operacional", 
        commercial: "Gestión Comercial",
        reports: "Reportes y Análisis",
        admin: "Administración"
      };
    }
    if (isOperationsManager) {
      return {
        dashboard: "Dashboard y Supervisión",
        operations: "Gestión Operacional",
        reports: "Reportes"
      };
    }
    if (isDispatcher) {
      return {
        dashboard: "Dashboard y Seguimiento",
        loads: "Gestión de Cargas",
        resources: "Recursos"
      };
    }
    if (isDriver) {
      return {
        dashboard: "Panel Personal",
        tasks: "Mis Tareas",
        financial: "Financiero"
      };
    }
    if (isSuperAdmin) {
      return {
        main: "Gestión Principal",
        monitoring: "Monitoreo",
        business: "Negocio",
        settings: "Configuración"
      };
    }
    return {};
  };

  // Función para renderizar una sección específica
  const renderSection = (sectionName: string, sectionLabel: string) => {
    const sectionItems = navigationItems.filter((item: any) => item.section === sectionName);
    if (sectionItems.length === 0) return null;

    return (
      <SidebarGroup key={sectionName} className={sectionName !== 'dashboard' && sectionName !== 'main' ? 'mt-4' : ''}>
        <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-white/80 uppercase tracking-wider">
          {sectionLabel}
        </SidebarGroupLabel>
        <Separator className="my-2 opacity-30 bg-white/20" />
        <SidebarGroupContent>
          <SidebarMenu className="space-y-1">
            {sectionItems.map((item: any) => {
              const active = isActive(item.url);
              const IconComponent = item.icon;
              
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={active}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                        active 
                          ? "bg-gradient-to-r from-fleet-orange to-fleet-orange-dark text-white shadow-lg shadow-fleet-orange/30 scale-[0.98] border border-fleet-orange/50" 
                          : "hover:bg-primary-glow/20 hover:scale-[0.99] hover:shadow-sm text-white/90 hover:text-white"
                      }`}
                    >
                     <div className={`p-2 rounded-lg transition-all duration-300 ${
                       active 
                         ? "bg-white/20 shadow-sm" 
                         : "bg-white/10 group-hover:bg-primary-glow/30"
                     }`}>
                       <IconComponent className={`h-4 w-4 ${
                         active ? "text-white drop-shadow-sm" : "text-white/80 group-hover:text-white"
                       }`} />
                     </div>
                     
                     {!collapsed && (
                       <div className="flex-1 min-w-0">
                         <div className={`font-medium text-sm ${
                           active ? "text-white" : "text-white/90 group-hover:text-white"
                         }`}>
                           {item.title}
                         </div>
                         <div className={`text-xs ${
                           active ? "text-white/80" : "text-white/70 group-hover:text-white/80"
                         }`}>
                           {item.description}
                         </div>
                       </div>
                     )}
                     
                     {/* Badge */}
                     {item.badge && !collapsed && (
                       <Badge 
                         className={`${getBadgeStyles(item.badgeVariant)} text-xs px-2 py-1 shadow-sm`}
                       >
                         {item.badge}
                       </Badge>
                     )}
                     
                     {/* Active indicator */}
                     {active && (
                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-sm"></div>
                     )}
                   </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-fleet-navy to-fleet-blue">
      {/* Header con logo y empresa */}
      <SidebarHeader className="px-4 py-6 border-b border-white/10 bg-gradient-to-r from-fleet-navy to-fleet-blue">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fleet-orange/20 rounded-lg backdrop-blur-sm border border-fleet-orange/30">
            <Command className="h-6 w-6 text-fleet-orange" />
          </div>
          
          {!collapsed && (
            <div className="flex-1">
              <h2 className="text-white font-semibold text-lg">FleetNest</h2>
              <p className="text-white/80 text-sm">Control de Flota</p>
            </div>
          )}
        </div>
        
        {/* Company Selection */}
        {!collapsed && !isSuperAdmin && companies && companies.length > 0 && (
          <div className="mt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between h-auto p-3 bg-white/10 hover:bg-fleet-orange/20 text-white border border-white/20 hover:border-fleet-orange/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-white/20">
                      <AvatarImage src={selectedCompany?.logo_url || ''} />
                      <AvatarFallback className="text-xs bg-fleet-orange/20 text-white border border-fleet-orange/30">
                        {selectedCompany?.name?.substring(0, 2)?.toUpperCase() || 'CO'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-medium text-sm truncate max-w-[120px]">
                        {selectedCompany?.name || 'Seleccionar empresa'}
                      </div>
                      <div className="text-xs text-white/70 capitalize">
                        {currentRole ? String(currentRole).replace('_', ' ') : 'Sin rol'}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className="flex items-center gap-3 p-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={company.logo_url || ''} />
                      <AvatarFallback className="text-xs">
                        {company.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{company.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Empresa activa
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SidebarHeader>

      {/* Contenido principal */}
      <SidebarContent className="px-3 py-4 space-y-6 bg-gradient-to-b from-transparent to-fleet-navy/20">
        {Object.entries(getSectionLabels()).map(([sectionName, sectionLabel]) => 
          renderSection(sectionName, sectionLabel)
        )}
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}