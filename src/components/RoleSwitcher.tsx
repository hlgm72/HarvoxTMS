import { ChevronDown, User, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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

// Jerarquía de roles según importancia organizacional
const roleLabels = {
  superadmin: 'Super Admin',
  company_owner: 'Propietario',
  general_manager: 'Gerente General', 
  operations_manager: 'Gerente de Operaciones',
  safety_manager: 'Gerente de Seguridad',
  senior_dispatcher: 'Despachador Senior',
  dispatcher: 'Despachador',
  driver: 'Conductor',
};

const roleColors = {
  superadmin: 'bg-rose-500 text-white hover:bg-rose-600',
  company_owner: 'bg-blue-500 text-white hover:bg-blue-600',
  general_manager: 'bg-indigo-500 text-white hover:bg-indigo-600',
  operations_manager: 'bg-purple-500 text-white hover:bg-purple-600',
  safety_manager: 'bg-red-500 text-white hover:bg-red-600',
  senior_dispatcher: 'bg-amber-600 text-white hover:bg-amber-700',
  dispatcher: 'bg-orange-500 text-white hover:bg-orange-600',
  driver: 'bg-green-500 text-white hover:bg-green-600',
};

export const RoleSwitcher = () => {
  const { currentRole, availableRoles, switchRole, hasMultipleRoles, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Function to get the correct dashboard route for a role
  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'company_owner':
        return '/dashboard/owner';
      case 'operations_manager':
        return '/dashboard/operations';
      case 'dispatcher':
      case 'senior_dispatcher':
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
    switchRole(role);
    const dashboardRoute = getDashboardRoute(role.role);
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
          {roleLabels[currentRole.role as keyof typeof roleLabels] || currentRole.role}
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
              {roleLabels[currentRole.role as keyof typeof roleLabels] || currentRole.role}
            </span>
            <Badge variant="secondary" className="text-xs">
              {availableRoles.length}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Cambiar Rol
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableRoles
          .sort((a, b) => {
            // Ordenar por jerarquía de roles
            const roleHierarchy = [
              'superadmin',
              'company_owner', 
              'general_manager',
              'operations_manager',
              'safety_manager',
              'senior_dispatcher',
              'dispatcher',
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
              currentRole.id === role.id 
                ? 'bg-primary/10 text-primary font-medium' 
                : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span>
                {roleLabels[role.role as keyof typeof roleLabels] || role.role}
              </span>
              {currentRole.id === role.id && (
                <Badge 
                  className={`text-xs ${roleColors[role.role as keyof typeof roleColors] || 'bg-gray-500 text-white'}`}
                >
                  Activo
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};