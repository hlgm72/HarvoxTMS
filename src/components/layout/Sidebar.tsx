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

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin", avatar: "ST" },
  { id: 2, name: "Prime Inc", role: "dispatcher", avatar: "PI" },
];

// Navegación para Company Owner
const companyOwnerNavigationItems = [
  { 
    title: "Dashboard Ejecutivo", 
    url: "/dashboard/owner", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel ejecutivo"
  },
  { 
    title: "Gestión de Usuarios", 
    url: "/users", 
    icon: Users, 
    description: "Usuarios y roles"
  },
  { 
    title: "Configuración", 
    url: "/settings", 
    icon: Settings,
    description: "Configuración de empresa"
  },
  { 
    title: "Reportes Financieros", 
    url: "/reports/financial", 
    icon: BarChart3,
    description: "Análisis financiero"
  },
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: "18",
    badgeVariant: "count" as const,
    description: "Gestión de conductores"
  },
  { 
    title: "Flota", 
    url: "/equipment", 
    icon: Truck, 
    badge: "42",
    badgeVariant: "count" as const,
    description: "Vehículos y equipos"
  },
  { 
    title: "Cargas", 
    url: "/loads", 
    icon: Package, 
    badge: "24",
    badgeVariant: "count" as const,
    description: "Gestión de cargas"
  },
  { 
    title: "Clientes", 
    url: "/clients", 
    icon: Building2,
    description: "Base de clientes"
  },
  { 
    title: "Facturación", 
    url: "/billing", 
    icon: CreditCard,
    description: "Facturación y pagos"
  },
  { 
    title: "Mi Perfil", 
    url: "/profile", 
    icon: Users,
    description: "Configuración personal"
  },
];

// Navegación para Operations Manager  
const operationsManagerNavigationItems = [
  { 
    title: "Dashboard Operacional", 
    url: "/dashboard/operations", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel operacional"
  },
  { 
    title: "Supervisión", 
    url: "/supervision", 
    icon: Activity, 
    description: "Supervisión de equipos"
  },
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: "18",
    badgeVariant: "count" as const,
    description: "Gestión de conductores"
  },
  { 
    title: "Flota", 
    url: "/equipment", 
    icon: Truck, 
    badge: "42",
    badgeVariant: "count" as const,
    description: "Vehículos y equipos"
  },
  { 
    title: "Cargas", 
    url: "/loads", 
    icon: Package, 
    badge: "24",
    badgeVariant: "count" as const,
    description: "Gestión de cargas"
  },
  { 
    title: "Rutas", 
    url: "/routes", 
    icon: Navigation,
    description: "Planificación de rutas"
  },
  { 
    title: "Reportes", 
    url: "/reports", 
    icon: BarChart3,
    description: "Reportes operacionales"
  },
  { 
    title: "Mi Perfil", 
    url: "/profile", 
    icon: Users,
    description: "Configuración personal"
  },
];

// Navegación para Dispatcher
const dispatcherNavigationItems = [
  { 
    title: "Dashboard", 
    url: "/dashboard/dispatch", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel de despacho"
  },
  { 
    title: "Cargas Activas", 
    url: "/loads/active", 
    icon: Package, 
    badge: "12",
    badgeVariant: "count" as const,
    description: "Cargas en progreso"
  },
  { 
    title: "Asignar Cargas", 
    url: "/loads/assign", 
    icon: Navigation,
    description: "Asignación de cargas"
  },
  { 
    title: "Conductores", 
    url: "/drivers", 
    icon: Users, 
    badge: "18",
    badgeVariant: "count" as const,
    description: "Estado de conductores"
  },
  { 
    title: "Seguimiento", 
    url: "/tracking", 
    icon: MapPin,
    description: "Seguimiento en tiempo real"
  },
  { 
    title: "Documentos", 
    url: "/documents", 
    icon: FileText,
    description: "Documentación"
  },
  { 
    title: "Mi Perfil", 
    url: "/profile", 
    icon: Users,
    description: "Configuración personal"
  },
];

// Navegación para Driver
const driverNavigationItems = [
  { 
    title: "Mi Dashboard", 
    url: "/dashboard/driver", 
    icon: Home, 
    description: "Panel personal"
  },
  { 
    title: "Mis Cargas", 
    url: "/my-loads", 
    icon: Package, 
    badge: "3",
    badgeVariant: "count" as const,
    description: "Cargas asignadas"
  },
  { 
    title: "Mis Documentos", 
    url: "/my-documents", 
    icon: FileText,
    description: "Documentos personales"
  },
  { 
    title: "Pagos", 
    url: "/payments", 
    icon: CreditCard,
    description: "Historial de pagos"
  },
  { 
    title: "Perfil", 
    url: "/profile", 
    icon: Users,
    description: "Mi perfil"
  },
];

// Función para obtener navegación traducida del superadmin
const getSuperAdminNavigationItems = (t: any) => [
  { 
    title: t('admin:navigation.dashboard'), 
    url: "/superadmin", 
    icon: Command, 
    badge: "Admin",
    badgeVariant: "admin" as const,
    description: t('admin:navigation.admin_panel')
  },
  { 
    title: t('admin:navigation.companies'), 
    url: "/superadmin/companies", 
    icon: Building2,
    description: t('admin:navigation.company_management')
  },
  { 
    title: t('admin:navigation.users'), 
    url: "/superadmin/users", 
    icon: Users,
    description: t('admin:navigation.system_users')
  },
  { 
    title: t('admin:navigation.system_health'), 
    url: "/superadmin/health", 
    icon: Heart, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: t('admin:navigation.system_status')
  },
  { 
    title: t('admin:navigation.analytics'), 
    url: "/superadmin/analytics", 
    icon: TrendingUp,
    description: t('admin:navigation.system_analytics')
  },
  { 
    title: t('admin:navigation.billing_management'), 
    url: "/superadmin/billing", 
    icon: CreditCard,
    description: t('admin:navigation.billing_management_desc')
  },
  { 
    title: t('admin:navigation.support_tickets'), 
    url: "/superadmin/support", 
    icon: Headphones,
    description: t('admin:navigation.support_management')
  },
  { 
    title: t('admin:navigation.system_settings'), 
    url: "/superadmin/settings", 
    icon: Settings,
    description: t('admin:navigation.system_configuration')
  },
  { 
    title: t('admin:navigation.api_logs'), 
    url: "/superadmin/logs", 
    icon: FileBarChart,
    description: t('admin:navigation.api_logs_desc')
  },
  { 
    title: t('admin:navigation.backup_security'), 
    url: "/superadmin/security", 
    icon: Lock,
    description: t('admin:navigation.security_backups')
  },
  { 
    title: "Mi Perfil", 
    url: "/profile", 
    icon: Users,
    description: "Configuración personal"
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
    isDriver 
  } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  
  const collapsed = state === "collapsed";
  
  console.log("Sidebar DEBUG:", { 
    state, 
    collapsed, 
    collapsible: "icon",
    dataCollapsible: state === "collapsed" ? "icon" : "",
    shouldApplyCss: state === "collapsed"
  });
  
  // Determinar navegación según el rol del usuario
  const getNavigationItems = () => {
    if (isSuperAdmin) return getSuperAdminNavigationItems(t);
    if (isCompanyOwner) return companyOwnerNavigationItems;
    if (isOperationsManager) return operationsManagerNavigationItems;
    if (isDispatcher) return dispatcherNavigationItems;
    if (isDriver) return driverNavigationItems;
    
    // Fallback para usuarios sin rol específico
    return dispatcherNavigationItems;
  };
  
  const navigationItems = getNavigationItems();

  const isActive = (path: string) => currentPath === path;
  
  const getBadgeStyles = (variant?: 'live' | 'count' | 'admin') => {
    switch (variant) {
      case 'live':
        return "bg-green-500 text-white animate-pulse";
      case 'admin':
        return "bg-primary text-primary-foreground";
      case 'count':
        return "bg-primary/10 text-primary border border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sidebar
      className="border-r bg-gradient-to-b from-background to-muted/20"
      collapsible="icon"
      variant="sidebar"
      side="left"
    >
      <SidebarHeader className="border-b border-border/40 p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            {!collapsed && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          
          {!collapsed && (
            <div className="flex-1 animate-fade-in">
              <h2 className="font-heading font-bold text-xl text-foreground">
                {isSuperAdmin ? "FleetNest Admin" : "FleetNest"}
              </h2>
              
              {/* Solo mostrar selector de compañía si NO es superadmin */}
              {!isSuperAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-between p-3 h-auto mt-2 hover:bg-accent/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {selectedCompany.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            {selectedCompany.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {selectedCompany.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {companies.map((company) => (
                      <DropdownMenuItem
                        key={company.id}
                        onClick={() => setSelectedCompany(company)}
                        className="flex items-center gap-3 p-3"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {company.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{company.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {company.role.replace('_', ' ')}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Para superadmin, mostrar información del sistema */}
              {isSuperAdmin && (
                <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-primary">{t('admin:navigation.system_administrator')}</p>
                      <p className="text-xs text-muted-foreground">{t('admin:navigation.global_access')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isSuperAdmin ? t('admin:navigation.system_management') : t('admin:navigation.navigation')}
          </SidebarGroupLabel>
          <Separator className="my-2 opacity-50" />
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
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
                         className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                           active 
                             ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-[0.98]" 
                             : "hover:bg-accent/50 hover:scale-[0.99] hover:shadow-sm"
                         }`}
                       >
                        <div className={`p-2 rounded-lg transition-all duration-200 ${
                          active 
                            ? "bg-white/20" 
                            : "bg-accent/30 group-hover:bg-accent/50"
                        }`}>
                          <IconComponent className={`h-4 w-4 ${
                            active ? "text-white" : "text-foreground"
                          }`} />
                        </div>
                        
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <div className="min-w-0">
                              <span className={`font-medium ${
                                active ? "text-white" : "text-foreground"
                              }`}>
                                {item.title}
                              </span>
                              <p className={`text-xs truncate ${
                                active ? "text-white/70" : "text-muted-foreground"
                              }`}>
                                {item.description}
                              </p>
                            </div>
                            
                            {item.badge && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs font-medium ${
                                  active 
                                    ? "bg-white/20 text-white border-white/30" 
                                    : getBadgeStyles(item.badgeVariant)
                                }`}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Active indicator */}
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions Section */}
        {!collapsed && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('admin:navigation.quick_actions')}
            </SidebarGroupLabel>
            <Separator className="my-2 opacity-50" />
            <SidebarGroupContent>
              <div className="space-y-2 px-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2 hover:bg-accent/50 transition-all"
                >
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">{t('admin:navigation.system_status')}</span>
                  <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                    {t('admin:navigation.online')}
                  </Badge>
                </Button>
                
                {isSuperAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2 hover:bg-accent/50 transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">{t('admin:navigation.quick_settings')}</span>
                  </Button>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}