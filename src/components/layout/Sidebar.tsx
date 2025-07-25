import { useState, useEffect } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, Command, Users, Truck, Package, MapPin, Building2, 
  CreditCard, BarChart3, FileText, Target, Activity, Shield, 
  Heart, TrendingUp, Headphones, Settings, FileBarChart, 
  Lock, Home, Navigation, Zap, Dot, DollarSign, Minus, Calculator, Fuel
} from "lucide-react";
import eagleLogo from "@/assets/high_res_eagle.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';
import { useDriversCount } from "@/hooks/useDriversCount";
import { useEquipmentCount } from "@/hooks/useEquipmentCount";
import { useUserCompanies } from "@/hooks/useUserCompanies";

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin", avatar: "ST" },
  { id: 2, name: "Prime Inc", role: "dispatcher", avatar: "PI" },
];

// Navegación para Company Owner
const getCompanyOwnerNavigationItems = (driversCount: number, equipmentCount: number) => [
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
     badge: equipmentCount.toString(),
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
  
  // Gestión Financiera
  { 
    title: "Deducciones", 
    url: "/deductions", 
    icon: Minus,
    description: "Gastos recurrentes",
    section: "financial"
  },
  { 
    title: "Gestión de Combustible", 
    url: "/fuel-management", 
    icon: Fuel,
    description: "Control de combustible",
    section: "financial"
  },
  { 
    title: "Tarjetas de Combustible WEX", 
    url: "/fuel-cards", 
    icon: CreditCard,
    description: "Gestión de tarjetas WEX",
    section: "financial"
  },
  { 
    title: "Pagos de Conductores", 
    url: "/payments", 
    icon: DollarSign,
    description: "Gestión de pagos",
    section: "financial"
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
    title: "Documentos", 
    url: "/documents", 
    icon: FileText,
    description: "Documentos de la compañía",
    section: "admin"
  },
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
const getOperationsManagerNavigationItems = (driversCount: number, equipmentCount: number) => [
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
     badge: equipmentCount.toString(),
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
  
  // Documentos y Reportes
  { 
    title: "Documentos", 
    url: "/documents", 
    icon: FileText,
    description: "Documentos de la compañía",
    section: "reports"
  },
  { 
    title: "Pagos de Conductores", 
    url: "/payments", 
    icon: DollarSign,
    description: "Gestión de pagos",
    section: "reports"
  },
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
  const { state, setOpen, openMobile, setOpenMobile } = useSidebar();
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
  const { equipmentCount } = useEquipmentCount();
  
  // Escuchar eventos del botón independiente solo para desktop
  useEffect(() => {
    const handleIndependentToggle = (event: CustomEvent) => {
      // console.log('📡 Sidebar received independent toggle:', event.detail);
      // Solo aplicar en desktop, en móvil el MenuToggle maneja directamente el contexto
      if (window.innerWidth >= 768) {
        setOpen(event.detail.open);
      }
    };
    
    window.addEventListener('independent-sidebar-toggle', handleIndependentToggle as EventListener);
    return () => {
      window.removeEventListener('independent-sidebar-toggle', handleIndependentToggle as EventListener);
    };
  }, [setOpen]);
  
  const collapsed = state === "collapsed";
  
  // Función para manejar clicks en enlaces de navegación
  const handleNavClick = () => {
    // Cerrar sidebar en móviles cuando se hace click en un enlace
    if (window.innerWidth < 768) {
      setOpenMobile(false);
    }
  };
  
  // Determinar navegación según el rol del usuario
  const getNavigationItems = () => {
    if (isSuperAdmin) return getSuperAdminNavigationItems(t);
    if (isCompanyOwner) return getCompanyOwnerNavigationItems(driversCount, equipmentCount);
    if (isOperationsManager) return getOperationsManagerNavigationItems(driversCount, equipmentCount);
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
        financial: "Gestión Financiera",
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
      <div key={sectionName} className="mb-1">
        {!collapsed && (
          <div className="px-4 py-1 text-xs font-body font-normal text-white/70 uppercase tracking-wide">
            {sectionLabel}
          </div>
        )}
        <div>
          <div className="space-y-0">
            {sectionItems.map((item: any) => {
              const active = isActive(item.url);
              const IconComponent = item.icon;
              
              return (
                 <div key={item.title}>
                   {collapsed ? (
                     <Tooltip>
                       <TooltipTrigger asChild>
                           <NavLink 
                             to={item.url} 
                             end
                             onClick={handleNavClick}
                             className={`font-body group relative flex items-center gap-3 transition-all duration-200 ${
                               collapsed ? 'px-3 py-2 justify-center' : 'px-4 py-2'
                             } ${
                               active 
                                 ? "bg-white/20 text-white shadow-lg border-l-2 border-white" 
                                 : "text-white/85 hover:bg-white/15 hover:text-white hover:shadow-md"
                             }`}
                          >
                            <IconComponent 
                              className={`!h-4 !w-4 flex-shrink-0 transition-all duration-200 ${
                                active ? "text-white drop-shadow-sm" : "text-white/70 group-hover:text-white"
                              }`} 
                              style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', lineHeight: '20px' }}
                            />
                            
                            {/* Active indicator - exacto como Limitless */}
                            {active && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white"></div>
                            )}
                          </NavLink>
                       </TooltipTrigger>
                       <TooltipContent side="right" className="bg-white text-slate-900 border-slate-200 shadow-lg">
                         <p>{item.title}</p>
                       </TooltipContent>
                     </Tooltip>
                   ) : (
                         <NavLink 
                           to={item.url} 
                           end
                           onClick={handleNavClick}
                          className={`font-body group relative flex items-center gap-3 transition-all duration-200 ${
                            collapsed ? 'px-3 py-2 justify-center' : 'px-4 py-2'
                          } ${
                            active 
                              ? "bg-white/20 text-white shadow-lg border-l-2 border-white" 
                              : "text-white/85 hover:bg-white/15 hover:text-white hover:shadow-md"
                          }`}
                      >
                        <IconComponent 
                          className={`!h-4 !w-4 flex-shrink-0 transition-all duration-200 ${
                            active ? "text-white drop-shadow-sm" : "text-white/70 group-hover:text-white"
                          }`} 
                          style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', lineHeight: '20px' }}
                        />
                       
                       {!collapsed && (
                         <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate font-body text-sm">
                              {item.title}
                            </span>
                           
                           {item.badge && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs font-medium px-1.5 py-0.5 ml-2 rounded-md shadow-sm ${
                                  active 
                                    ? "bg-white/30 text-white border-white/50" 
                                    : "bg-white/15 text-white/90 border-white/30 group-hover:bg-white/25 group-hover:text-white"
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
                   )}
                  </div>
               );
             })}
           </div>
         </div>
       </div>
     );
  };

  return (
    <Sidebar
      className="overflow-x-hidden mr-0"
      collapsible="icon"
      variant="sidebar"
      side="left"
      style={{ 
        backgroundColor: 'hsl(var(--sidebar-background))',
        width: collapsed ? '64px' : 'var(--sidebar-width)',
        overflowX: 'hidden',
        marginRight: '0px'
      } as any}
    >
      <SidebarHeader className={`border-b border-[hsl(var(--sidebar-border))] ${collapsed ? 'px-3 py-4' : 'px-6 py-6'}`} style={{ 
        backgroundColor: 'hsl(var(--fleet-sidebar-darker))'
      }}>
        <div className={`flex items-center transition-all duration-300 ${collapsed ? 'justify-center' : 'gap-4'}`}>
          {/* Logo Container with Professional Styling */}
          <div className="relative group">
            <div className={`${collapsed ? 'w-14 h-14' : 'w-20 h-20'} bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}>
              <img 
                src={eagleLogo} 
                alt="FleetNest Logo" 
                className={`${collapsed ? 'w-12 h-12' : 'w-18 h-18'} object-contain transition-all duration-300 group-hover:scale-110`}
              />
            </div>
          </div>
          
          {!collapsed && (
            <div className="flex-1 animate-fade-in">
              {/* Brand Section */}
              <div className="space-y-1">
                <h2 className="font-bold text-xl text-white tracking-tight leading-none bg-gradient-to-r from-white to-white/90 bg-clip-text">
                  FleetNest
                  {isSuperAdmin && <span className="text-blue-300 ml-2 text-sm font-medium">Admin</span>}
                </h2>
                <p className="text-sm text-white/70 font-medium tracking-wide">
                  Professional TMS
                </p>
              </div>
              
              {/* Superadmin Badge - More Professional */}
              {isSuperAdmin && (
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-400/30 backdrop-blur-sm animate-scale-in">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t('admin:navigation.system_administrator')}</p>
                      <p className="text-xs text-blue-200/80">{t('admin:navigation.global_access')}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Indicator */}
              {!isSuperAdmin && (
                <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">System Online</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`py-2 ${collapsed ? 'px-2' : 'px-0'}`} style={{ backgroundColor: 'hsl(var(--fleet-sidebar-darker))' }}>
        <TooltipProvider>
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
        </TooltipProvider>

        {/* Company selector moved to bottom - Professional style */}
        {!collapsed && !isSuperAdmin && !loading && selectedCompany && (
          <div className="mt-auto px-4 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start p-3 h-auto bg-white hover:bg-slate-50 transition-all duration-200 border border-slate-200 rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-7 w-7 flex items-center justify-center">
                      {selectedCompany.logo_url ? (
                        <img 
                          src={selectedCompany.logo_url} 
                          alt={selectedCompany.name}
                          className="h-7 w-7 object-contain rounded-md shadow-sm"
                        />
                      ) : (
                        <div className="h-7 w-7 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center rounded-md shadow-sm">
                          {selectedCompany.avatar}
                        </div>
                      )}
                    </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-slate-900 leading-tight truncate">
                         {selectedCompany.name}
                       </p>
                       <p className="text-xs text-slate-500 capitalize leading-tight">
                         {currentRole?.replace('_', ' ') || 'Sin rol'}
                       </p>
                     </div>
                     <ChevronDown className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-72 border border-slate-200 rounded-lg shadow-xl bg-white"
              >
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    className="flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-md m-1 transition-all duration-150 cursor-pointer"
                  >
                    <div className="h-8 w-8 flex items-center justify-center">
                      {company.logo_url ? (
                        <img 
                          src={company.logo_url} 
                          alt={company.name}
                          className="h-8 w-8 object-contain rounded-md"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center rounded-md shadow-sm">
                          {company.avatar}
                        </div>
                      )}
                    </div>
                     <div className="flex flex-col flex-1">
                       <span className="font-medium text-slate-900 text-sm leading-tight">{company.name}</span>
                       <span className="text-xs text-slate-500 capitalize leading-tight">
                         {company.role.replace('_', ' ')}
                       </span>
                     </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Bottom section como en Limitless */}
        <div className={`${collapsed ? 'px-3 py-2' : 'px-4 py-4'} border-t border-[hsl(var(--sidebar-border))]`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300 text-xs">
              <Activity className="h-3 w-3" />
              <span>System Status</span>
              <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
