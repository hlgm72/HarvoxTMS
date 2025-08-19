import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useFleetNotifications } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { createPhoneHandlers, handleTextBlur } from '@/lib/textUtils';
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { X } from "lucide-react";

interface User {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  created_at: string;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'company_owner', label: 'Dueño de la Empresa' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'senior_dispatcher', label: 'Despachador Senior' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'driver', label: 'Conductor' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export function EditUserDialog({ isOpen, onClose, user, onSuccess }: EditUserDialogProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const { userRole } = useAuth();
  const { assignRole, removeRole, loading: rolesLoading } = useUserRoles();
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState<string>('');
  const [userStatus, setUserStatus] = useState<string>('active');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      // Cargar datos del usuario
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setUserStatus(user.status);
      setNewRole('');
      
      // Cargar roles actuales del usuario
      loadUserRoles();
    }
  }, [isOpen, user]);

  const loadUserRoles = async () => {
    if (!user || !userRole?.company_id) return;

    try {
      const { data: roles, error } = await supabase
        .from('user_company_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true);

      if (error) throw error;

      setUserRoles(roles?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error loading user roles:', error);
      showError('Error al cargar los roles del usuario');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Limpiar datos de entrada
      const cleanedFirstName = handleTextBlur(firstName);
      const cleanedLastName = handleTextBlur(lastName);
      const cleanedPhone = handleTextBlur(phone);

      // Actualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: cleanedFirstName,
          last_name: cleanedLastName,
          phone: cleanedPhone,
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Actualizar estado del usuario en user_company_roles
      const { error: statusError } = await supabase
        .from('user_company_roles')
        .update({ is_active: userStatus === 'active' })
        .eq('user_id', user.id)
        .eq('company_id', userRole?.company_id);

      if (statusError) throw statusError;

      showSuccess('Perfil actualizado correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!user || !newRole || !userRole?.company_id) return;

    // Verificar si ya tiene el rol
    if (userRoles.includes(newRole)) {
      showError('El usuario ya tiene este rol');
      return;
    }

    const result = await assignRole(user.id, userRole.company_id, newRole as any);
    
    if (result.success) {
      showSuccess('Rol agregado correctamente');
      setNewRole('');
      loadUserRoles();
      onSuccess?.(); // Notificar al componente padre para actualizar la lista
    } else {
      showError(result.error || 'Error al agregar el rol');
    }
  };

  const handleRemoveRole = async (roleToRemove: string) => {
    if (!user || !userRole?.company_id) return;

    // No permitir eliminar el último rol
    if (userRoles.length <= 1) {
      showError('No se puede eliminar el último rol del usuario');
      return;
    }

    const result = await removeRole(user.id, userRole.company_id, roleToRemove as any);
    
    if (result.success) {
      showSuccess('Rol eliminado correctamente');
      loadUserRoles();
      onSuccess?.(); // Notificar al componente padre para actualizar la lista
    } else {
      showError(result.error || 'Error al eliminar el rol');
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find(option => option.value === role)?.label || role;
  };

  const availableRoles = ROLE_OPTIONS.filter(option => !userRoles.includes(option.value));

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border shadow-lg">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica la información del usuario y gestiona sus roles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => {
                  const handlers = createPhoneHandlers(setPhone);
                  handlers.onChange(e);
                }}
                onKeyPress={(e) => {
                  const handlers = createPhoneHandlers(setPhone);
                  handlers.onKeyPress(e);
                }}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={userStatus} onValueChange={setUserStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gestión de Roles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Roles</h3>
            
            {/* Roles actuales */}
            <div className="space-y-2">
              <Label>Roles Actuales</Label>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => {
                  const getRoleBadgeWithColors = (role: string) => {
                    const roleConfig: Record<string, { label: string; variant: string; className: string }> = {
                      'superadmin': { 
                        label: '🔧 Super Admin', 
                        variant: 'default',
                        className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700'
                      },
                      'company_owner': { 
                        label: '👑 Company Owner', 
                        variant: 'default',
                        className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                      },
                      'operations_manager': { 
                        label: '👨‍💼 Operations Manager', 
                        variant: 'default',
                        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                      },
                      'general_manager': { 
                        label: '👨‍💼 General Manager', 
                        variant: 'default',
                        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                      },
                      'safety_manager': { 
                        label: '⚠️ Safety Manager', 
                        variant: 'default',
                        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700'
                      },
                      'senior_dispatcher': { 
                        label: '📋 Senior Dispatcher', 
                        variant: 'default',
                        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700'
                      },
                      'dispatcher': { 
                        label: '📋 Dispatcher', 
                        variant: 'default',
                        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                      },
                      'driver': { 
                        label: '🚛 Driver', 
                        variant: 'default',
                        className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700'
                      },
                      'multi_company_dispatcher': { 
                        label: '🏢 Multi-Company Dispatcher', 
                        variant: 'default',
                        className: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-700'
                      },
                    };

                    const config = roleConfig[role] || { 
                      label: role, 
                      variant: 'outline',
                      className: 'bg-gray-50 text-gray-600 border-gray-300'
                    };

                    return config;
                  };

                  const roleConfig = getRoleBadgeWithColors(role);
                  
                  return (
                    <Badge 
                      key={role} 
                      variant={roleConfig.variant as any} 
                      className={`flex items-center gap-2 ${roleConfig.className}`}
                    >
                      {roleConfig.label}
                      {userRoles.length > 1 && (
                        <button
                          onClick={() => handleRemoveRole(role)}
                          disabled={loading || rolesLoading}
                          className="ml-1 text-xs hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {userRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin roles asignados</p>
                )}
              </div>
            </div>

            {/* Agregar nuevo rol */}
            {availableRoles.length > 0 && (
              <div className="space-y-2">
                <Label>Agregar Rol</Label>
                <div className="flex gap-2">
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddRole}
                    disabled={!newRole || loading || rolesLoading}
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSaveProfile} disabled={loading || rolesLoading}>
            {loading || rolesLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}