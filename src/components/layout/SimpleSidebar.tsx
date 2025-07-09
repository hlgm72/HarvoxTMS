import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronDown, Command, Users, Truck, Package, MapPin, Building2, 
  CreditCard, BarChart3, FileText, Target, Activity, Shield, 
  Heart, TrendingUp, Headphones, Settings, FileBarChart, 
  Lock, Home, Navigation, Zap, PanelLeft
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
];

interface SimpleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SimpleSidebar({ isCollapsed, onToggle }: SimpleSidebarProps) {
  const { isSuperAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  
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
    <div 
      className={`fixed left-0 top-0 h-screen z-50 border-r bg-gradient-to-b from-background to-muted/20 transition-all duration-300 ${
        isCollapsed ? "w-12" : "w-72"
      }`}
    >
      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="font-heading font-bold text-xl text-foreground">
                {isSuperAdmin ? "FleetNest Admin" : "FleetNest"}
              </h2>
              
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
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-7 w-7"
          onClick={onToggle}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <div className="p-2 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {isSuperAdmin ? "System Management" : "Navigation"}
        </div>
        <Separator className="my-2 opacity-50" />
        
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(item.url);
            const IconComponent = item.icon;
            
            return (
              <NavLink 
                key={item.title}
                to={item.url} 
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
                
                {!isCollapsed && (
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
                
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}