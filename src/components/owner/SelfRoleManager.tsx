import { useState } from 'react';
import { Plus, Trash2, User, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useFleetNotifications } from '@/components/notifications';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

const availableRoles: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'general_manager',
    label: 'Gerente General',
    description: 'Gestión completa de operaciones y estrategia'
  },
  {
    value: 'operations_manager',
    label: 'Gerente de Operaciones',
    description: 'Supervisión de operaciones diarias'
  },
  {
    value: 'senior_dispatcher',
    label: 'Dispatcher Senior',
    description: 'Gestión avanzada de despacho y coordinación'
  },
  {
    value: 'dispatcher',
    label: 'Dispatcher',
    description: 'Coordinación de cargas y conductores'
  },
  {
    value: 'driver',
    label: 'Conductor',
    description: 'Operación directa de vehículos'
  },
  {
    value: 'safety_manager',
    label: 'Gerente de Seguridad',
    description: 'Gestión de seguridad y cumplimiento'
  },
];

const roleColors = {
  company_owner: 'bg-blue-100 text-blue-800',
  general_manager: 'bg-green-100 text-green-800',
  operations_manager: 'bg-orange-100 text-orange-800',
  senior_dispatcher: 'bg-indigo-100 text-indigo-800',
  dispatcher: 'bg-cyan-100 text-cyan-800',
  driver: 'bg-emerald-100 text-emerald-800',
  safety_manager: 'bg-red-100 text-red-800',
};

export const SelfRoleManager = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { availableRoles: userRoles, isCompanyOwner, hasMultipleRoles } = useAuth();
  const { assignSelfRole, removeSelfRole, loading } = useUserRoles();
  const { showSuccess, showError } = useFleetNotifications();

  if (!isCompanyOwner) {
    return null;
  }

  const currentRoleValues = userRoles.map(r => r.role);
  const availableToAdd = availableRoles.filter(
    role => !currentRoleValues.includes(role.value)
  );

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    const result = await assignSelfRole(selectedRole);
    
    if (result.success) {
      showSuccess(
        'Rol Asignado',
        `Te has asignado el rol de ${availableRoles.find(r => r.value === selectedRole)?.label}`
      );
      setDialogOpen(false);
      setSelectedRole('');
    } else {
      showError('Error', result.error || 'No se pudo asignar el rol');
    }
  };

  const handleRemoveRole = async (role: UserRole) => {
    const result = await removeSelfRole(role);
    
    if (result.success) {
      showSuccess(
        'Rol Removido',
        `Has removido el rol de ${availableRoles.find(r => r.value === role)?.label}`
      );
    } else {
      showError('Error', result.error || 'No se pudo remover el rol');
    }
  };

  const getRoleLabel = (role: UserRole) => {
    if (role === 'company_owner') return 'Propietario';
    return availableRoles.find(r => r.value === role)?.label || role;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Mis Roles en la Compañía
        </CardTitle>
        <CardDescription>
          Como propietario, puedes asignarte roles adicionales para acceder a diferentes funcionalidades del sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Roles Actuales</h4>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((userRole) => (
              <div key={userRole.id} className="flex items-center gap-2">
                <Badge 
                  variant="secondary"
                  className={roleColors[userRole.role as keyof typeof roleColors] || ''}
                >
                  <User className="h-3 w-3 mr-1" />
                  {getRoleLabel(userRole.role as UserRole)}
                </Badge>
                {userRole.role !== 'company_owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveRole(userRole.role as UserRole)}
                    disabled={loading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {availableToAdd.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Agregar Rol</h4>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Asignar Rol Adicional
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar Rol Adicional</DialogTitle>
                  <DialogDescription>
                    Selecciona un rol adicional que quieras ejercer en tu compañía.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {role.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setSelectedRole('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAssignRole}
                      disabled={!selectedRole || loading}
                    >
                      {loading ? 'Asignando...' : 'Asignar Rol'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {hasMultipleRoles && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Usa el selector de roles en la parte superior derecha para cambiar entre tus diferentes roles y acceder a las funcionalidades correspondientes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};