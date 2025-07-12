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

  // Función para renderizar una sección específica
  const renderSection = (sectionName: string, sectionLabel: string) => {
    const sectionItems = navigationItems.filter((item: any) => item.section === sectionName);
    if (sectionItems.length === 0) return null;

    return (
      <SidebarGroup key={sectionName} className="mb-6">
        <SidebarGroupLabel className="mx-4 mb-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
          <Dot className="h-2 w-2 text-accent" />
          {sectionLabel}
        </SidebarGroupLabel>
        <SidebarGroupContent className="px-2">
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
                      className={`group relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out ${
                        active 
                          ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20 scale-[1.02]" 
                          : "text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground hover:scale-[1.01]"
                      }`}
                    >
                     <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                       active 
                         ? "bg-accent-foreground/10" 
                         : "bg-muted/50 group-hover:bg-accent/20"
                     }`}>
                       <IconComponent className={`h-4 w-4 transition-all duration-300 ${
                         active ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent"
                       }`} />
                     </div>
                     
                     {!collapsed && (
                       <div className="flex items-center justify-between flex-1 min-w-0">
                         <div className="min-w-0">
                           <span className={`font-medium text-sm transition-colors duration-300 ${
                             active ? "text-accent-foreground" : "text-foreground group-hover:text-accent-foreground"
                           }`}>
                             {item.title}
                           </span>
                           {item.description && (
                             <p className={`text-xs truncate mt-0.5 transition-colors duration-300 ${
                               active ? "text-accent-foreground/70" : "text-muted-foreground/80 group-hover:text-accent-foreground/60"
                             }`}>
                               {item.description}
                             </p>
                           )}
                         </div>
                         
                         {item.badge && (
                           <Badge 
                             variant={active ? "default" : "secondary"}
                             className={`text-xs font-medium px-2 py-0.5 transition-all duration-300 ${
                               active 
                                 ? "bg-accent-foreground/10 text-accent-foreground border-accent-foreground/20" 
                                 : "bg-muted text-muted-foreground border-muted-foreground/20 group-hover:bg-accent/20 group-hover:text-accent group-hover:border-accent/30"
                             }`}
                           >
                             {item.badge}
                           </Badge>
                         )}
                       </div>
                     )}
                     
                     {/* Indicador activo mejorado */}
                     {active && (
                       <>
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full"></div>
                         <div className="absolute inset-0 border border-accent/30 rounded-xl"></div>
                       </>
                     )}
                     
                     {/* Efecto hover mejorado */}
                     <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                       !active ? "opacity-0 group-hover:opacity-100 bg-gradient-to-r from-accent/5 to-accent/10" : ""
                     }`}></div>
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
      className="border-r border-border/50 bg-sidebar shadow-xl"
      collapsible="icon"
      variant="sidebar"
      side="left"
    >
      <SidebarHeader className="border-b border-border/30 p-6 bg-gradient-to-br from-sidebar to-muted/20">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-11 h-11 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-accent/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-accent/20">
              <Zap className="h-6 w-6 text-accent transition-all duration-300 group-hover:rotate-12" />
            </div>
            {!collapsed && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse shadow-lg shadow-accent/50"></div>
            )}
          </div>
          
          {!collapsed && (
            <div className="flex-1 animate-fade-in">
              <h2 className="font-heading font-bold text-xl text-foreground tracking-tight">
                {isSuperAdmin ? "FleetNest Admin" : "FleetNest"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">TMS Platform</p>
              
              {/* Company selector profesional */}
              {!isSuperAdmin && !loading && selectedCompany && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between p-3 h-auto mt-4 bg-muted/50 hover:bg-muted/80 transition-all duration-300 text-foreground border border-border/30 rounded-xl shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 flex items-center justify-center">
                          {selectedCompany.logo_url ? (
                            <img 
                              src={selectedCompany.logo_url} 
                              alt={selectedCompany.name}
                              className="h-7 w-7 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="h-7 w-7 bg-accent/20 text-accent text-xs font-bold flex items-center justify-center rounded-lg">
                              {selectedCompany.avatar}
                            </div>
                          )}
                        </div>
                         <div className="text-left">
                           <p className="text-sm font-semibold text-foreground">
                             {selectedCompany.name}
                           </p>
                           <p className="text-xs text-muted-foreground capitalize">
                             {currentRole?.role.replace('_', ' ') || 'Sin rol'}
                           </p>
                         </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-background border-border shadow-xl rounded-xl">
                    {companies.map((company) => (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => setSelectedCompany(company)}
                        className="flex items-center gap-3 p-3 rounded-lg m-1 transition-all duration-200 hover:bg-accent/10 focus:bg-accent/10"
                      >
                        <div className="h-8 w-8 flex items-center justify-center">
                          {company.logo_url ? (
                            <img 
                              src={company.logo_url} 
                              alt={company.name}
                              className="h-8 w-8 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="h-8 w-8 bg-accent/20 text-accent text-sm font-bold flex items-center justify-center rounded-lg">
                              {company.avatar}
                            </div>
                          )}
                        </div>
                         <div className="flex flex-col">
                           <span className="font-semibold text-foreground">{company.name}</span>
                           <span className="text-xs text-muted-foreground capitalize">
                             {company.role.replace('_', ' ')}
                           </span>
                         </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Superadmin info profesional */}
              {isSuperAdmin && (
                <div className="mt-4 p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-accent/20 rounded-lg">
                      <Shield className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t('admin:navigation.system_administrator')}</p>
                      <p className="text-xs text-muted-foreground">{t('admin:navigation.global_access')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 bg-gradient-to-b from-sidebar to-muted/10">
        {isSuperAdmin ? (
          // Para SuperAdmin: Estilo profesional
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

        {/* Quick Actions Section - Estilo profesional */}
        {!collapsed && (
          <div className="mt-6 p-4 bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('admin:navigation.quick_actions')}
              </span>
            </div>
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-3 bg-background/50 hover:bg-accent/10 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md border border-border/20"
              >
                <div className="p-1 bg-green-500/20 rounded-md">
                  <Activity className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-sm font-medium">{t('admin:navigation.system_status')}</span>
                <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200 text-xs">
                  {t('admin:navigation.online')}
                </Badge>
              </Button>
              
              {isSuperAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-3 bg-background/50 hover:bg-accent/10 transition-all duration-300 rounded-lg shadow-sm hover:shadow-md border border-border/20"
                >
                  <div className="p-1 bg-accent/20 rounded-md">
                    <Settings className="h-3 w-3 text-accent" />
                  </div>
                  <span className="text-sm font-medium">{t('admin:navigation.quick_settings')}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}