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
import { LogOut } from "lucide-react";
import { useFleetNotifications } from '@/components/notifications';
import { Link, useNavigate } from "react-router-dom";

export function Header() {
  const { t } = useTranslation(['common', 'fleet']);
  const { signOut } = useAuth();
  const { getUserInitials, getFullName, user, profile } = useUserProfile();
  const { showSuccess, showError } = useFleetNotifications();
  const navigate = useNavigate();

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
    <header className="h-16 border-b border-border/10 bg-background/98 backdrop-blur-xl supports-[backdrop-filter]:bg-background/95 z-30 shadow-sm">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2 hover:bg-muted/50 rounded-lg transition-colors" />
          <div className="border-l border-border/20 pl-4">
            <h1 className="text-xl font-bold bg-gradient-fleet bg-clip-text text-transparent tracking-tight">
              {t('fleet:titles.command_center')}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse shadow-sm"></span>
              {t('fleet:states.real_time_operations')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-lg">
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