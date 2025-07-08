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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import fleetNestLogo from "@/assets/fleetnest-logo.png";

// Mock data for companies
const companies = [
  { id: 1, name: "Swift Transportation", role: "company_admin" },
  { id: 2, name: "Prime Inc", role: "dispatcher" },
];

const navigationItems = [
  { title: "Centro de Comando", url: "/", icon: "🎯", badge: "Live" },
  { title: "Conductores", url: "/drivers", icon: "👨‍✈️", badge: "18" },
  { title: "Flota", url: "/equipment", icon: "🚛", badge: "42" },
  { title: "Cargas", url: "/loads", icon: "📦", badge: "24" },
  { title: "Rutas", url: "/routes", icon: "🗺️" },
  { title: "Clientes", url: "/clients", icon: "🏢" },
  { title: "Facturación", url: "/billing", icon: "💰" },
  { title: "Reportes", url: "/reports", icon: "📊" },
  { title: "Documentos", url: "/documents", icon: "📄" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent";

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={fleetNestLogo} 
            alt="FleetNest" 
            className="w-8 h-8 rounded-lg"
          />
          {!collapsed && (
            <div className="flex-1">
              <h2 className="font-bold text-lg text-foreground">FleetNest</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between p-2 h-auto"
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {selectedCompany.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedCompany.role}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className="flex flex-col items-start"
                    >
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {company.role}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <span className="text-lg mr-3">{item.icon}</span>
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.badge === "Live" 
                                ? "bg-fleet-green text-white animate-pulse" 
                                : "bg-primary/10 text-primary"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}