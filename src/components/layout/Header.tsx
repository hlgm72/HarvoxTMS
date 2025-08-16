import { Button } from "@/components/ui/button";
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
import { LogOut, Settings, User } from "lucide-react";
import { useFleetNotifications } from '@/components/notifications';
import { Link, useNavigate } from "react-router-dom";
import { MenuToggle } from "./MenuToggle";
import { useSidebar } from "@/components/ui/sidebar";

export function Header() {
  const { t } = useTranslation(['common', 'fleet']);
  const { signOut } = useAuth();
  const { getUserInitials, getFullName, user, profile } = useUserProfile();
  const { showSuccess, showError } = useFleetNotifications();
  const navigate = useNavigate();
  const { open, isMobile, state } = useSidebar();

  const handleLogout = async () => {
    try {
      await signOut();
      // Don't navigate - let the auth context and ProtectedRoute handle it
    } catch (error) {
      showError(
        "Error",
        "No se pudo cerrar la sesión. Inténtalo de nuevo."
      );
    }
  };
  
  const getLeftPosition = () => {
    if (isMobile) return 'left-0';
    if (open) return 'left-[280px]'; // Cuando está abierto, dejar espacio completo del Sidebar
    return 'left-16'; // Cuando está contraído, usar 64px que coincide con el sidebar contraído
  };

  return (
    <header className={`fixed top-0 right-0 z-40 h-14 md:h-16 bg-card backdrop-blur-xl supports-[backdrop-filter]:bg-card/92 shadow-sm border-b border-border/60 duration-200 transition-[left] ease-linear ${getLeftPosition()}`}>
      <div className="flex h-full items-center justify-between pr-3 md:pr-6">
        {/* Menu Toggle */}
        <MenuToggle />

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Role Switcher - oculto en móvil muy pequeño */}
          <div className="hidden sm:flex items-center px-2 md:px-3 py-1.5 bg-white/40 rounded-lg border border-border/10">
            <RoleSwitcher />
          </div>
          
          {/* Language Switcher - siempre visible al lado del avatar */}
          <LanguageSwitcher />
          
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
              
              {/* Control de rol en móvil */}
              <div className="sm:hidden p-2 border-b border-border">
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <RoleSwitcher />
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