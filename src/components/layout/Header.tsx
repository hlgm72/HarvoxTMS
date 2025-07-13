import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useState, useCallback, useEffect } from "react";
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
import { LogOut, Users, LayoutDashboard, Truck, Settings, User, Building2, Menu } from "lucide-react";
import { useFleetNotifications } from '@/components/notifications';
import { Link, useNavigate, useLocation } from "react-router-dom";

export function Header() {
  // Estado completamente independiente del contexto
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Solo después del mount marcamos como cliente
  useEffect(() => {
    setIsClient(true);
    console.log('🔄 Header mounted - client side ready');
  }, []);
  
  // Función robusta para el toggle que siempre funciona
  const handleMenuToggle = useCallback(() => {
    console.log('🔘 Menu clicked - isClient:', isClient);
    
    // Primero intentamos con el contexto si estamos en cliente
    if (isClient) {
      try {
        // Creamos una referencia dinámica al contexto
        const sidebarModule = require('@/components/ui/sidebar');
        const { useSidebar } = sidebarModule;
        const context = useSidebar();
        
        if (context && context.toggleSidebar) {
          console.log('✅ Using sidebar context');
          context.toggleSidebar();
          return;
        }
      } catch (error) {
        console.log('⚠️ Sidebar context not available:', error);
      }
    }
    
    // Fallback: toggle local y forzar evento global
    console.log('🔄 Using fallback toggle');
    setLocalMenuOpen(prev => {
      const newState = !prev;
      // Dispatchar evento global para el sidebar
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
        detail: { open: newState } 
      }));
      return newState;
    });
  }, [isClient]);
  
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
      case '/clients':
        return {
          icon: Building2,
          title: 'Gestión de Clientes',
          subtitle: 'Administra tus clientes y brokers'
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
    <header className="h-14 md:h-16 border-b border-border bg-card backdrop-blur-xl supports-[backdrop-filter]:bg-card/92 z-20 shadow-sm">
      <div className="flex h-full items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Botón menú - SIEMPRE VISIBLE CON FUERZA TOTAL */}
          <div className="flex-shrink-0" style={{ position: 'relative', zIndex: 50 }}>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 rounded-full border border-border bg-background shadow-md hover:shadow-lg transition-all duration-200 relative z-30 flex items-center justify-center"
              onClick={handleMenuToggle}
              style={{ 
                display: 'flex',
                visibility: 'visible',
                opacity: 1,
                minWidth: '32px',
                minHeight: '32px'
              } as React.CSSProperties}
            >
              <Menu className="h-4 w-4" style={{ display: 'block' }} />
            </Button>
          </div>
          
          {/* Título responsivo */}
          <div className="border-l border-border/20 pl-2 md:pl-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-gradient-fleet rounded-lg flex-shrink-0">
                <IconComponent className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-xl font-bold bg-gradient-fleet bg-clip-text text-transparent tracking-tight truncate">
                  {pageInfo.title}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground font-medium truncate hidden sm:block">
                  {pageInfo.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Controles responsivos - ocultos en móvil muy pequeño */}
          <div className="hidden sm:flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 bg-white/40 rounded-lg border border-border/10">
            <RoleSwitcher />
            <div className="w-px h-4 bg-border/30"></div>
            <LanguageSwitcher />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 md:h-10 rounded-full hover:bg-muted/50 transition-all duration-200 flex items-center gap-2 md:gap-3 px-2 md:px-3">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-primary/10 transition-all duration-200 hover:ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                  <AvatarFallback className="bg-gradient-fleet text-white font-semibold text-xs md:text-sm">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden lg:block">
                  {profile?.first_name || user?.email?.split('@')[0] || 'Usuario'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 md:w-64 p-1 bg-card border-border shadow-xl backdrop-blur-sm" align="end">
              <DropdownMenuLabel className="p-3 md:p-4 border-b border-border">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground">{getFullName()}</p>
                  <p className="text-xs leading-none text-muted-foreground font-medium">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              
              {/* Controles de idioma/rol en móvil */}
              <div className="sm:hidden p-2 border-b border-border">
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <RoleSwitcher />
                  <div className="w-px h-4 bg-border/30"></div>
                  <LanguageSwitcher />
                </div>
              </div>
              
              <div className="p-1">
                <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg hover:bg-accent text-foreground transition-colors">
                  <Link to="/profile" className="w-full flex items-center">
                    <User className="mr-3 h-4 w-4" />
                    {t('common:navigation.profile', 'Mi Perfil')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-lg hover:bg-accent text-foreground transition-colors">
                  <Link to="/settings" className="w-full flex items-center">
                    <Settings className="mr-3 h-4 w-4" />
                    {t('common:navigation.settings', 'Configuración')}
                  </Link>
                </DropdownMenuItem>
                <div className="my-1 h-px bg-border"></div>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="p-3 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg transition-colors flex items-center"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  {t('common:navigation.logout', 'Cerrar Sesión')}
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}