import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LogOut, Users, LayoutDashboard, Truck, Settings, User, Building2 } from "lucide-react";
import { useFleetNotifications } from '@/components/notifications';
import { Link, useNavigate, useLocation } from "react-router-dom";

export function Header() {
  const { t } = useTranslation(['common', 'fleet']);
  const { signOut } = useAuth();
  const { getUserInitials, getFullName, user, profile } = useUserProfile();
  const { showSuccess, showError } = useFleetNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Función para obtener información de la página actual
  const getPageInfo = () => {
    const path = location.pathname;
    
    switch (path) {
      case '/users':
        return {
          icon: Users,
          title: 'Gestión de Usuarios',
          subtitle: 'Administra los usuarios de tu empresa'
        };
      case '/dashboard':
        return {
          icon: LayoutDashboard,
          title: 'Centro de Comando FleetNest',
          subtitle: 'Operaciones en tiempo real'
        };
      case '/drivers':
        return {
          icon: Truck,
          title: 'Gestión de Conductores',
          subtitle: 'Administra tu flota de conductores'
        };
      case '/companies':
        return {
          icon: Building2,
          title: 'Gestión de Empresas',
          subtitle: 'Administra las empresas del sistema'
        };
      case '/settings':
        return {
          icon: Settings,
          title: 'Configuración',
          subtitle: 'Ajustes del sistema'
        };
      case '/profile':
        return {
          icon: User,
          title: 'Perfil de Usuario',
          subtitle: 'Gestiona tu información personal'
        };
      default:
        return {
          icon: LayoutDashboard,
          title: 'Centro de Comando FleetNest',
          subtitle: 'Operaciones en tiempo real'
        };
    }
  };

  const pageInfo = getPageInfo();
  const IconComponent = pageInfo.icon;

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess(
        "Sesión cerrada",
        "Has cerrado sesión exitosamente."
      );
      navigate('/auth');
    } catch (error) {
      showError(
        "Error",
        "No se pudo cerrar la sesión. Inténtalo de nuevo."
      );
    }
  };
  
  return (
    <header className="h-16 border-b border-border bg-card backdrop-blur-xl supports-[backdrop-filter]:bg-card/92 z-5 shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2 hover:bg-muted/50 rounded-lg transition-colors" />
          <div className="border-l border-border/20 pl-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-fleet rounded-lg">
                <IconComponent className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-fleet bg-clip-text text-transparent tracking-tight">
                  {pageInfo.title}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-sm"></span>
                  {pageInfo.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/40 rounded-lg border border-border/10">
            <RoleSwitcher />
            <div className="w-px h-4 bg-border/30"></div>
            <LanguageSwitcher />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted/50 transition-all duration-200">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10 transition-all duration-200 hover:ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                  <AvatarFallback className="bg-gradient-fleet text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2" align="end">
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{getFullName()}</p>
                  <p className="text-xs leading-none text-muted-foreground font-medium">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="p-3 cursor-pointer">
                <Link to="/profile" className="w-full">
                  {t('common:navigation.profile', 'Perfil')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-3 cursor-pointer">
                <Link to="/settings" className="w-full">
                  {t('common:navigation.settings', 'Configuración')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="p-3 text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('common:navigation.logout', 'Cerrar Sesión')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}