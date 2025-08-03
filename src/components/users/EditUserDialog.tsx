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
  { value: 'general_manager', label: 'Gerente General' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'safety_manager', label: 'Gerente de Seguridad' },
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

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_company_roles')
        .insert({
          user_id: user.id,
          company_id: userRole.company_id,
          role: newRole as any,
          is_active: true,
        });

      if (error) throw error;

      showSuccess('Rol agregado correctamente');
      setNewRole('');
      loadUserRoles();
    } catch (error) {
      console.error('Error adding role:', error);
      showError('Error al agregar el rol');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleToRemove: string) => {
    if (!user || !userRole?.company_id) return;

    // No permitir eliminar el último rol
    if (userRoles.length <= 1) {
      showError('No se puede eliminar el último rol del usuario');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_company_roles')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('company_id', userRole.company_id)
        .eq('role', roleToRemove as any);

      if (error) throw error;

      showSuccess('Rol eliminado correctamente');
      loadUserRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      showError('Error al eliminar el rol');
    } finally {
      setLoading(false);
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
                {userRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="flex items-center gap-2">
                    {getRoleLabel(role)}
                    {userRoles.length > 1 && (
                      <button
                        onClick={() => handleRemoveRole(role)}
                        disabled={loading}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
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
                    disabled={!newRole || loading}
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
          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}