import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Mail, Shield, Edit, Trash2, Users as UsersIcon, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  email: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  first_name?: string;
  last_name?: string;
  created_at: string;
}

interface InviteUserForm {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Conductor' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'safety_manager', label: 'Gerente de Seguridad' },
];

export default function Users() {
  const { t } = useTranslation(['common']);
  const { user, userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    role: '',
    first_name: '',
    last_name: ''
  });

  // Cargar usuarios al montar el componente
  useEffect(() => {
    if (userRole?.company_id) {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    if (!userRole?.company_id) return;
    
    setLoading(true);
    try {
      // Obtener usuarios de la empresa con sus roles
      const { data: companyUsers, error } = await supabase
        .from('user_company_roles')
        .select(`
          user_id,
          role,
          is_active,
          created_at
        `)
        .eq('company_id', userRole.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!companyUsers || companyUsers.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Obtener perfiles de usuarios
      const userIds = [...new Set(companyUsers.map(u => u.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Agrupar por usuario para manejar múltiples roles
      const usersMap = new Map<string, User>();
      
      companyUsers.forEach(userRole => {
        const userId = userRole.user_id;
        const profile = profiles?.find(p => p.user_id === userId);
        
        if (usersMap.has(userId)) {
          // Usuario ya existe, agregar rol adicional
          const existingUser = usersMap.get(userId)!;
          existingUser.role = existingUser.role + ', ' + getRoleLabel(userRole.role);
        } else {
          // Nuevo usuario
          usersMap.set(userId, {
            id: userId,
            email: 'N/A', // Se actualizará después si es posible
            role: getRoleLabel(userRole.role),
            status: userRole.is_active ? 'active' : 'inactive',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            created_at: userRole.created_at
          });
        }
      });

      // Intentar obtener emails desde auth si es el usuario actual
      if (user?.id && usersMap.has(user.id)) {
        const currentUser = usersMap.get(user.id)!;
        currentUser.email = user.email || 'N/A';
      }

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.role) {
      toast.error('Email y rol son requeridos');
      return;
    }

    setLoading(true);
    
    try {
      // Llamar a la función edge para enviar invitación
      const { data, error } = await supabase.functions.invoke('send-company-owner-invitation', {
        body: {
          email: inviteForm.email,
          role: inviteForm.role,
          first_name: inviteForm.first_name,
          last_name: inviteForm.last_name,
        }
      });

      if (error) throw error;

      toast.success('Invitación enviada exitosamente');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: '', first_name: '', last_name: '' });
      
      // Recargar la lista de usuarios
      fetchUsers();
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error(error.message || 'Error al enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactivo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'company_owner': 'Propietario',
      'driver': 'Conductor',
      'dispatcher': 'Despachador',
      'operations_manager': 'Gerente de Operaciones',
      'safety_manager': 'Gerente de Seguridad',
      'senior_dispatcher': 'Despachador Senior',
      'general_manager': 'Gerente General',
      'superadmin': 'Super Admin'
    };
    
    return roleLabels[role] || role;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de tu empresa
          </p>
        </div>
        
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitar Nuevo Usuario
              </DialogTitle>
              <DialogDescription>
                Envía una invitación por email para que se una a tu empresa.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={inviteForm.first_name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Apellido"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Rol *</Label>
                <Select 
                  value={inviteForm.role} 
                  onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Enviando...' : 'Enviar Invitación'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios de la Empresa</CardTitle>
          <CardDescription>
            Lista de todos los usuarios registrados en tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                      Cargando usuarios...
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-6 animate-fade-in">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center">
                          <UsersIcon className="h-12 w-12 text-muted-foreground/60" />
                        </div>
                      </div>
                      
                      <div className="space-y-3 max-w-sm">
                        <h3 className="text-xl font-semibold text-foreground">
                          No hay usuarios registrados aún
                        </h3>
                        
                        <p className="text-muted-foreground text-center leading-relaxed">
                          Utiliza el botón "Invitar Usuario" para comenzar.
                        </p>
                        
                        <div className="pt-4">
                          <Button 
                            onClick={() => setInviteDialogOpen(true)}
                            className="gap-2"
                          >
                            <UserPlus className="h-4 w-4" />
                            Invitar Usuario
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : 'Sin nombre'
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.role.split(', ').map((role, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
