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
  Lock, Home, Navigation, Zap, Dot
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

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin", avatar: "ST" },
  { id: 2, name: "Prime Inc", role: "dispatcher", avatar: "PI" },
];

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
    return {};
  };

  // Función para renderizar una sección específica - ESTILO LIMITLESS EXACTO
  const renderSection = (sectionName: string, sectionLabel: string) => {
    const sectionItems = navigationItems.filter((item: any) => item.section === sectionName);
    if (sectionItems.length === 0) return null;

    return (
      <SidebarGroup key={sectionName} className="mb-2">
        {!collapsed && (
          <SidebarGroupLabel className="px-4 py-2 text-xs font-medium text-white/70 uppercase tracking-wide">
            {sectionLabel}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="space-y-0">
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
                       className={`group relative flex items-center gap-3 text-sm font-medium transition-all duration-200 ${
                         collapsed ? 'px-3 py-2.5 justify-center' : 'px-4 py-2.5'
                       } ${
                         active 
                           ? "bg-white/15 text-white" 
                           : "text-white/80 hover:bg-white/10 hover:text-white"
                       }`}
                    >
                     <IconComponent className={`h-4 w-4 flex-shrink-0 ${
                       active ? "text-white" : "text-white/70 group-hover:text-white"
                     }`} />
                     
                     {!collapsed && (
                       <div className="flex items-center justify-between flex-1 min-w-0">
                         <span className="truncate">
                           {item.title}
                         </span>
                         
                         {item.badge && (
                           <Badge 
                             variant="secondary" 
                             className={`text-xs font-medium px-1.5 py-0.5 ml-2 ${
                               active 
                                 ? "bg-white/25 text-white border-white/40" 
                                 : "bg-white/10 text-white/80 border-white/20 group-hover:bg-white/20 group-hover:text-white"
                             }`}
                           >
                             {item.badge}
                           </Badge>
                         )}
                       </div>
                     )}
                     
                     {/* Active indicator - exacto como Limitless */}
                     {active && (
                       <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white"></div>
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
    <Sidebar
      className="border-r border-[hsl(var(--sidebar-border))]"
      collapsible="icon"
      variant="sidebar"
      side="left"
      style={{ 
        backgroundColor: 'hsl(var(--sidebar-background))',
        width: collapsed ? '64px' : 'var(--sidebar-width)'
      } as any}
    >
      <SidebarHeader className={`border-b border-[hsl(var(--sidebar-border))] ${collapsed ? 'py-2 px-2' : 'p-4'}`} style={{ backgroundColor: 'hsl(var(--fleet-sidebar-darker))', width: collapsed ? '64px' : 'auto' }}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative">
            <div className="w-8 h-8 bg-[hsl(217_91%_60%)] rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </div>
          
          {!collapsed && (
            <div className="flex-1">
              <h2 className="font-semibold text-base text-white tracking-tight">
                {isSuperAdmin ? "FleetNest Admin" : "FleetNest"}
              </h2>
              <p className="text-xs text-white/70">TMS Platform</p>
              
              {/* Company selector - Estilo Limitless exacto */}
              {!isSuperAdmin && !loading && selectedCompany && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between p-2 h-auto mt-3 bg-[hsl(217_24%_20%)]/50 hover:bg-[hsl(217_24%_20%)] transition-colors text-white border border-[hsl(217_24%_16%)] rounded-md"
                    >
                      <div className="flex items-center gap-2 text-left">
                        <div className="h-5 w-5 flex items-center justify-center">
                          {selectedCompany.logo_url ? (
                            <img 
                              src={selectedCompany.logo_url} 
                              alt={selectedCompany.name}
                              className="h-5 w-5 object-contain rounded"
                            />
                          ) : (
                            <div className="h-5 w-5 bg-[hsl(217_91%_60%)] text-white text-xs font-semibold flex items-center justify-center rounded">
                              {selectedCompany.avatar}
                            </div>
                          )}
                        </div>
                         <div>
                           <p className="text-sm font-medium text-white leading-tight">
                             {selectedCompany.name}
                           </p>
                           <p className="text-xs text-[hsl(215_20%_65%)] capitalize leading-tight">
                             {currentRole?.role.replace('_', ' ') || 'Sin rol'}
                           </p>
                         </div>
                      </div>
                      <ChevronDown className="h-3 w-3 text-[hsl(215_20%_65%)]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="start" 
                    className="w-64 border border-[hsl(217_24%_16%)] rounded-md" 
                    style={{ backgroundColor: 'hsl(217 24% 14%)' }}
                  >
                    {companies.map((company) => (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => setSelectedCompany(company)}
                        className="flex items-center gap-3 p-3 text-white hover:bg-[hsl(217_24%_20%)] rounded-sm m-1"
                      >
                        <div className="h-6 w-6 flex items-center justify-center">
                          {company.logo_url ? (
                            <img 
                              src={company.logo_url} 
                              alt={company.name}
                              className="h-6 w-6 object-contain rounded"
                            />
                          ) : (
                            <div className="h-6 w-6 bg-[hsl(217_91%_60%)] text-white text-xs font-semibold flex items-center justify-center rounded">
                              {company.avatar}
                            </div>
                          )}
                        </div>
                         <div className="flex flex-col">
                           <span className="font-medium text-white text-sm">{company.name}</span>
                           <span className="text-xs text-[hsl(215_20%_65%)] capitalize">
                             {company.role.replace('_', ' ')}
                           </span>
                         </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Superadmin info - Estilo Limitless exacto */}
              {isSuperAdmin && (
                <div className="mt-3 p-3 bg-[hsl(217_91%_60%)]/20 rounded-md border border-[hsl(217_91%_60%)]/30">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-[hsl(217_91%_60%)]" />
                    <div>
                      <p className="text-sm font-medium text-white">{t('admin:navigation.system_administrator')}</p>
                      <p className="text-xs text-[hsl(215_20%_65%)]">{t('admin:navigation.global_access')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`py-2 ${collapsed ? 'px-2' : 'px-0'}`} style={{ backgroundColor: 'hsl(var(--fleet-sidebar-darker))' }}>
        {isSuperAdmin ? (
          // Para SuperAdmin: Estilo Limitless exacto
          <>
            {/* Sección Principal */}
            {renderSection("main", t('admin:navigation.main_management'))}

            {/* Otras secciones usando el mismo renderSection */}
            {renderSection("monitoring", t('admin:navigation.monitoring'))}
            {renderSection("business", t('admin:navigation.business'))}
            {renderSection("settings", t('admin:navigation.settings'))}
          </>
        ) : (
          // Para otros roles: Renderizar por secciones con separadores
          <>
            {Object.entries(getSectionLabels()).map(([sectionName, sectionLabel]) => 
              renderSection(sectionName, sectionLabel)
            )}
          </>
        )}

        {/* Bottom section como en Limitless */}
        {!collapsed && (
          <div className="mt-auto p-4 border-t border-[hsl(217_24%_16%)]">
            <div className="flex items-center gap-2 text-[hsl(215_20%_65%)] text-xs">
              <Activity className="h-3 w-3" />
              <span>System Status</span>
              <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}