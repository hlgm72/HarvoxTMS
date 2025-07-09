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

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin", avatar: "ST" },
  { id: 2, name: "Prime Inc", role: "dispatcher", avatar: "PI" },
];

// Navegación para compañías transportistas
const companyNavigationItems = [
  { 
    title: "Centro de Comando", 
    url: "/", 
    icon: Target, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Panel principal"
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
    title: "Reportes", 
    url: "/reports", 
    icon: BarChart3,
    description: "Análisis y reportes"
  },
  { 
    title: "Documentos", 
    url: "/documents", 
    icon: FileText,
    description: "Documentación"
  },
];

// Navegación para Superadmin
const superAdminNavigationItems = [
  { 
    title: "Dashboard", 
    url: "/superadmin", 
    icon: Command, 
    badge: "Admin",
    badgeVariant: "admin" as const,
    description: "Panel de control"
  },
  { 
    title: "Companies", 
    url: "/superadmin/companies", 
    icon: Building2,
    description: "Gestión de empresas"
  },
  { 
    title: "Users", 
    url: "/superadmin/users", 
    icon: Users,
    description: "Usuarios del sistema"
  },
  { 
    title: "System Health", 
    url: "/superadmin/health", 
    icon: Heart, 
    badge: "Live",
    badgeVariant: "live" as const,
    description: "Estado del sistema"
  },
  { 
    title: "Analytics", 
    url: "/superadmin/analytics", 
    icon: TrendingUp,
    description: "Análisis del sistema"
  },
  { 
    title: "Billing Management", 
    url: "/superadmin/billing", 
    icon: CreditCard,
    description: "Gestión de facturación"
  },
  { 
    title: "Support Tickets", 
    url: "/superadmin/support", 
    icon: Headphones,
    description: "Tickets de soporte"
  },
  { 
    title: "System Settings", 
    url: "/superadmin/settings", 
    icon: Settings,
    description: "Configuración"
  },
  { 
    title: "API Logs", 
    url: "/superadmin/logs", 
    icon: FileBarChart,
    description: "Registros de API"
  },
  { 
    title: "Backup & Security", 
    url: "/superadmin/security", 
    icon: Lock,
    description: "Seguridad y respaldos"
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isSuperAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  
  const collapsed = state === "collapsed";
  
  // Usar navegación según el tipo de usuario
  const navigationItems = isSuperAdmin ? superAdminNavigationItems : companyNavigationItems;

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
                      <p className="text-sm font-medium text-primary">System Administrator</p>
                      <p className="text-xs text-muted-foreground">Global Access Control</p>
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
            {isSuperAdmin ? "System Management" : "Navigation"}
          </SidebarGroupLabel>
          <Separator className="my-2 opacity-50" />
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const active = isActive(item.url);
                const IconComponent = item.icon;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
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
              Quick Actions
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
                  <span className="text-sm">System Status</span>
                  <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
                    Online
                  </Badge>
                </Button>
                
                {isSuperAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2 hover:bg-accent/50 transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Quick Settings</span>
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