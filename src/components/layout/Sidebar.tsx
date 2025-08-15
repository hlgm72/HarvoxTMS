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
  Lock, Home, Navigation, Zap, Dot, DollarSign, Receipt, Calculator, Fuel
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
import { useEquipmentCount } from "@/hooks/useEquipmentCount";
import { useLoadsCount } from "@/hooks/useLoadsCount";
import { useUserCompanies } from "@/hooks/useUserCompanies";

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin", avatar: "ST" },
  { id: 2, name: "Prime Inc", role: "dispatcher", avatar: "PI" },
];

// Navegación para Company Owner
const getCompanyOwnerNavigationItems = (driversCount: number, equipmentCount: number, loadsCount: number, t: any) => [
  // Dashboard
  { 
    title: t('company.sidebar.navigation.executive_dashboard'), 
    url: "/dashboard/owner", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: t('company.sidebar.descriptions.executive_panel'),
    section: "dashboard"
  },
  
  // Gestión Operacional
  { 
    title: t('company.sidebar.navigation.drivers'), 
    url: "/drivers", 
    icon: Users, 
    badge: driversCount.toString(),
    badgeVariant: "count" as const,
    description: t('company.sidebar.descriptions.driver_management'),
    section: "operations"
  },
  { 
    title: t('company.sidebar.navigation.fleet'), 
    url: "/equipment", 
    icon: Truck, 
     badge: equipmentCount.toString(),
    badgeVariant: "count" as const,
    description: t('company.sidebar.descriptions.vehicles_equipment'),
    section: "operations"
  },
  { 
    title: t('company.sidebar.navigation.loads'), 
    url: "/loads", 
    icon: Package, 
    badge: loadsCount.toString(),
    badgeVariant: "count" as const,
    description: t('company.sidebar.descriptions.load_management'),
    section: "operations"
  },
  
  // Gestión Comercial
  { 
    title: t('company.sidebar.navigation.clients'), 
    url: "/clients", 
    icon: Building2,
    description: t('company.sidebar.descriptions.client_base'),
    section: "commercial"
  },
  { 
    title: t('company.sidebar.navigation.billing'), 
    url: "/billing", 
    icon: CreditCard,
    description: t('company.sidebar.descriptions.billing_payments'),
    section: "commercial"
  },
  
  // Gestión Financiera
  { 
    title: t('company.sidebar.navigation.additional_payments'), 
    url: "/additional-payments", 
    icon: Calculator,
    description: t('company.sidebar.descriptions.additional_income'),
    section: "financial"
  },
  { 
    title: t('company.sidebar.navigation.deductions'), 
    url: "/deductions", 
    icon: Receipt,
    description: t('company.sidebar.descriptions.recurring_expenses'),
    section: "financial"
  },
  { 
    title: t('company.sidebar.navigation.fuel_management'), 
    url: "/fuel-management", 
    icon: Fuel,
    description: t('company.sidebar.descriptions.fuel_control'),
    section: "financial"
  },
  { 
    title: t('company.sidebar.navigation.driver_payments'), 
    url: "/payments", 
    icon: DollarSign,
    description: t('company.sidebar.descriptions.payment_management'),
    section: "financial"
  },
  
  // Reportes y Análisis
  { 
    title: t('company.sidebar.navigation.payment_reports'), 
    url: "/payment-reports", 
    icon: FileBarChart,
    description: t('company.sidebar.descriptions.pdf_payment_reports'),
    section: "reports"
  },
  { 
    title: t('company.sidebar.navigation.financial_reports'), 
    url: "/reports/financial", 
    icon: BarChart3,
    description: t('company.sidebar.descriptions.financial_analysis'),
    section: "reports"
  },
  
  // Administración
  { 
    title: t('company.sidebar.navigation.documents'), 
    url: "/documents", 
    icon: FileText,
    description: t('company.sidebar.descriptions.company_documents'),
    section: "admin"
  },
  { 
    title: t('company.sidebar.navigation.user_management'), 
    url: "/users", 
    icon: Users, 
    description: t('company.sidebar.descriptions.users_roles'),
    section: "admin"
  },
  { 
    title: t('company.sidebar.navigation.settings'), 
    url: "/settings", 
    icon: Settings,
    description: t('company.sidebar.descriptions.company_settings'),
    section: "admin"
  },
];

// Navegación para Operations Manager  
const getOperationsManagerNavigationItems = (driversCount: number, equipmentCount: number, loadsCount: number) => [
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
    badge: loadsCount.toString(),
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
    title: "Dashboard", 
    url: "/superadmin", 
    icon: Command, 
    badge: "Admin",
    badgeVariant: "admin" as const,
    description: "Admin panel",
    section: "main"
  },
  { 
    title: "Companies", 
    url: "/superadmin/companies", 
    icon: Building2,
    description: "Company management",
    section: "main"
  },
  { 
    title: "Users", 
    url: "/superadmin/users", 
    icon: Users,
    description: "System users",
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
  const { t, i18n } = useTranslation('common');
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
  const { data: loadsCount = 0 } = useLoadsCount();
  
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
    if (isCompanyOwner) return getCompanyOwnerNavigationItems(driversCount, equipmentCount, loadsCount, t);
    if (isOperationsManager) return getOperationsManagerNavigationItems(driversCount, equipmentCount, loadsCount);
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
        dashboard: t('company.sidebar.sections.dashboard'),
        operations: t('company.sidebar.sections.operations'), 
        commercial: t('company.sidebar.sections.commercial'),
        financial: t('company.sidebar.sections.financial'),
        reports: t('company.sidebar.sections.reports'),
        admin: t('company.sidebar.sections.admin')
      };
    }
    if (isOperationsManager) {
      return {
        dashboard: t('company.sidebar.sections.monitoring'),
        operations: t('company.sidebar.sections.operations'),
        reports: t('company.sidebar.sections.reports')
      };
    }
    if (isDispatcher) {
      return {
        dashboard: t('company.sidebar.sections.monitoring'),
        loads: t('company.sidebar.sections.loads'),
        resources: t('company.sidebar.sections.resources')
      };
    }
    if (isDriver) {
      return {
        dashboard: t('company.sidebar.descriptions.personal_panel'),
        tasks: t('company.sidebar.sections.tasks'),
        financial: t('company.sidebar.sections.financial')
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
                                collapsed ? 'w-full py-2 justify-center' : 'px-4 py-2'
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
                            collapsed ? 'w-full py-2 justify-center' : 'px-4 py-2'
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
                                 className={`text-xs font-medium px-1.5 py-0.5 rounded-md shadow-sm ${
                                   item.badgeVariant === "live"
                                     ? "bg-red-500 text-white border-red-600 animate-pulse"
                                     : active 
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
    <TooltipProvider>
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
      <SidebarHeader className={`border-b border-[hsl(var(--sidebar-border))] ${collapsed ? 'py-4' : 'px-6 py-6'}`} style={{ 
        backgroundColor: 'hsl(var(--fleet-sidebar-darker))'
      }}>
        <div className={`flex items-center transition-all duration-300 ${collapsed ? 'justify-center' : 'gap-4'}`}>
          {/* Logo Container with Professional Styling */}
          <div className="relative group">
            <img 
              src="/lovable-uploads/a5a7d46d-7f62-4a44-9ac6-0b8e2b1d0a71.png" 
              alt="FleetNest Logo" 
              className={`${collapsed ? 'w-14 h-14' : 'w-20 h-20'} object-contain transition-all duration-300 group-hover:scale-110`}
            />
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
                  {t('company.sidebar.company.professional_tms')}
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
                  <span className="font-medium">{t('company.sidebar.status.system_online')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`py-2 ${collapsed ? '' : 'px-0'}`} style={{ backgroundColor: 'hsl(var(--fleet-sidebar-darker))' }}>
          {isSuperAdmin ? (
            // Para SuperAdmin: Estilo Limitless exacto
            <>
              {/* Sección Principal */}
              {renderSection("main", "Main Management")}

              {/* Otras secciones usando el mismo renderSection */}
              {renderSection("monitoring", "Monitoring")}
              {renderSection("business", "Business")}
              {renderSection("settings", "Settings")}
            </>
          ) : (
            // Para otros roles: Renderizar por secciones con separadores
            <>
              {Object.entries(getSectionLabels()).map(([sectionName, sectionLabel]) => 
                renderSection(sectionName, sectionLabel)
              )}
            </>
          )}

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
                            {currentRole?.replace('_', ' ') || t('company.sidebar.status.no_role')}
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
        <div className={`${collapsed ? 'py-2' : 'px-4 py-4'} border-t border-[hsl(var(--sidebar-border))]`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-300 text-xs">
              <Activity className="h-3 w-3" />
              <span>{t('company.sidebar.status.system_status')}</span>
              <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  );
}
