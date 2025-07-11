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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from 'react-i18next';

export function Header() {
  const { t } = useTranslation(['common', 'fleet']);
  
  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="p-2" />
          <div>
            <h1 className="text-xl font-semibold bg-gradient-fleet bg-clip-text text-transparent">
              {t('fleet:titles.command_center')}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              {t('fleet:states.real_time_operations')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            + {t('fleet:loads.new_load', '+ Nueva Carga')}
          </Button>
          <Button size="sm" className="bg-gradient-fleet text-white shadow-fleet">
            🚨 {t('fleet:actions.quick_dispatch', 'Despacho Rápido')}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    JD
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>{t('common:navigation.account', 'Mi Cuenta')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t('common:navigation.profile', 'Perfil')}</DropdownMenuItem>
              <DropdownMenuItem>{t('common:navigation.settings', 'Configuración')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t('common:navigation.logout', 'Cerrar Sesión')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}