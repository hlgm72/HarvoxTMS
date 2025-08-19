import { ChevronDown, User, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const RoleSwitcher = () => {
  const { t } = useTranslation('common');
  const { currentRole, availableRoles, switchRole, hasMultipleRoles, loading, isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();

  // Function to get role label with translation
  const getRoleLabel = (role: string) => {
    return t(`roles.labels.${role}`, { defaultValue: role });
  };

  const roleColors = {
    superadmin: 'bg-purple-500 text-white hover:bg-purple-600',
    company_owner: 'bg-amber-500 text-white hover:bg-amber-600',
    operations_manager: 'bg-blue-500 text-white hover:bg-blue-600',
    dispatcher: 'bg-emerald-500 text-white hover:bg-emerald-600',
    driver: 'bg-orange-500 text-white hover:bg-orange-600',
    multi_company_dispatcher: 'bg-cyan-500 text-white hover:bg-cyan-600',
  };

  // Function to get the correct dashboard route for a role
  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'company_owner':
        return '/dashboard/owner';
      case 'operations_manager':
        return '/dashboard/operations';
      case 'dispatcher':
      case 'multi_company_dispatcher':
        return '/dashboard/dispatch';
      case 'driver':
        return '/dashboard/driver';
      case 'superadmin':
        return '/superadmin';
      default:
        return '/dashboard/dispatch'; // fallback
    }
  };

  const handleRoleChange = (role: any) => {
    // Debug logs have been commented out for production
    
    // FIRST: Guardar el rol INMEDIATAMENTE y de forma síncrona ANTES de switchRole
    const roleString = JSON.stringify(role);
    localStorage.setItem('currentRole', roleString);
    localStorage.setItem('lastActiveRole', roleString);
    sessionStorage.setItem('activeRole', roleString);
    // console.log('🔄 RoleSwitcher: Rol guardado PRIMERO en storage:', role.role);
    // console.log('🔄 RoleSwitcher: Verificando localStorage después de guardar:', localStorage.getItem('currentRole'));
    
    // SECOND: Llamar switchRole DESPUÉS de guardar - usando role.id como espera el context
    switchRole(role.id);
    // console.log('🔄 RoleSwitcher: switchRole llamado con role.id:', role.id);
    
    // THIRD: Navegar y actualizar la URL actual
    const dashboardRoute = getDashboardRoute(role.role);
    // console.log('🔄 RoleSwitcher: Navegando a:', dashboardRoute);
    
    // Actualizar la URL actual para que futuras pestañas se abran aquí
    window.history.replaceState(null, '', dashboardRoute);
    // console.log('🔄 RoleSwitcher: URL actualizada a:', dashboardRoute);
    
    navigate(dashboardRoute);
  };

  // Don't render while loading or if not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  // Don't render if no current role or no available roles
  if (!currentRole || !availableRoles.length) {
    return null;
  }

  // If user has only one role, show it as read-only
  if (!hasMultipleRoles) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
        <User className="h-4 w-4" />
        <span className="text-sm font-medium">
          {getRoleLabel(currentRole)}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-48 justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">
              {getRoleLabel(currentRole)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {availableRoles.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-200 shadow-lg z-50">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {t('roles.switcher.change_role')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableRoles
          .sort((a, b) => {
            // Ordenar por jerarquía de roles (solo 6 roles)
            const roleHierarchy = [
              'superadmin',
              'company_owner', 
              'operations_manager',
              'dispatcher',
              'multi_company_dispatcher',
              'driver'
            ];
            const aIndex = roleHierarchy.indexOf(a.role);
            const bIndex = roleHierarchy.indexOf(b.role);
            return aIndex - bIndex;
          })
          .map((role) => (
          <DropdownMenuItem
            key={role.id}
            onClick={() => handleRoleChange(role)}
            className={`cursor-pointer ${
               role.id === userRole?.id
                ? 'bg-primary/10 text-primary font-medium' 
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span>
                {getRoleLabel(role.role)}
              </span>
              {role.id === userRole?.id && (
                <Badge 
                  className={`text-xs ${roleColors[role.role as keyof typeof roleColors] || 'bg-gray-500 text-white'}`}
                >
                  {t('roles.switcher.active')}
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};