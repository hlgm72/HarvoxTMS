import { ChevronDown, User, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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

const roleLabels = {
  superadmin: 'Super Administrador',
  company_owner: 'Propietario',
  general_manager: 'Gerente General',
  operations_manager: 'Gerente de Operaciones',
  senior_dispatcher: 'Dispatcher Senior',
  dispatcher: 'Dispatcher',
  driver: 'Conductor',
  safety_manager: 'Gerente de Seguridad',
};

const roleColors = {
  superadmin: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  company_owner: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  general_manager: 'bg-green-100 text-green-800 hover:bg-green-200',
  operations_manager: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  senior_dispatcher: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  dispatcher: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
  driver: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  safety_manager: 'bg-red-100 text-red-800 hover:bg-red-200',
};

export const RoleSwitcher = () => {
  const { currentRole, availableRoles, switchRole, hasMultipleRoles } = useAuth();

  if (!currentRole || !hasMultipleRoles) {
    return null;
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
        
        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role.id}
            onClick={() => switchRole(role)}
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
                  variant="secondary" 
                  className={`text-xs ${roleColors[role.role as keyof typeof roleColors] || ''}`}
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