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
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  Users as UsersIcon, Grid, List,
  Activity, Clock, AlertCircle, TrendingUp, Search, Filter, X, UserPlus, Mail, Shield, Edit, Trash2, Eye,
  Truck
} from "lucide-react";
import { useFleetNotifications } from "@/components/notifications";
import { handleTextBlur, createTextHandlers } from "@/lib/textUtils";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { EditDriverModal } from "@/components/EditDriverModal";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { UserFiltersSheet } from "@/components/users/UserFiltersSheet";

type UserRole = Database["public"]["Enums"]["user_role"];

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

interface InviteUserForm {
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

const ROLE_OPTIONS = [
  { value: 'general_manager', label: 'Gerente General' },
  { value: 'operations_manager', label: 'Gerente de Operaciones' },
  { value: 'safety_manager', label: 'Gerente de Seguridad' },
  { value: 'senior_dispatcher', label: 'Despachador Senior' },
  { value: 'dispatcher', label: 'Despachador' },
  { value: 'driver', label: 'Conductor' },
];

export default function Users() {
  const { t } = useTranslation(['common']);
  const { user, userRole } = useAuth();
  const { showSuccess, showError, showInfo } = useFleetNotifications();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteUserForm>({
    email: '',
    role: '',
    first_name: '',
    last_name: ''
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState<string>('');
  const [updatingRoles, setUpdatingRoles] = useState(false);
  
  // Estado para el modal de edición de conductor
  const [editDriverModalOpen, setEditDriverModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para estadísticas del dashboard
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0,
    usersByRole: {} as Record<string, number>,
    recentUsers: 0
  });

  // Estado para la vista actual (tabla o tarjetas)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

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
        .select('user_id, first_name, last_name, avatar_url, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Agrupar por usuario para manejar múltiples roles
      const usersMap = new Map<string, User>();
      
      companyUsers.forEach(companyUserRole => {
        const userId = companyUserRole.user_id;
        const profile = profiles?.find(p => p.user_id === userId);
        
        if (usersMap.has(userId)) {
          // Usuario ya existe, agregar rol adicional
          const existingUser = usersMap.get(userId)!;
          existingUser.role = existingUser.role + ', ' + getRoleLabel(companyUserRole.role);
        } else {
          // Nuevo usuario
          usersMap.set(userId, {
            id: userId,
            email: 'N/A', // Se actualizará después si es posible
            phone: profile?.phone || '',
            role: getRoleLabel(companyUserRole.role),
            status: companyUserRole.is_active ? 'active' : 'inactive',
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            avatar_url: profile?.avatar_url || '',
            created_at: companyUserRole.created_at
          });
        }
      });

      // Obtener emails para usuarios con privilegios administrativos
      const hasAdminPrivileges = userRole?.role && [
        'superadmin', 
        'company_owner', 
        'general_manager', 
        'operations_manager'
      ].includes(userRole.role);

      if (hasAdminPrivileges) {
        // Los administradores pueden ver emails de invitaciones aceptadas
        try {
          const { data: invitations, error: invError } = await supabase
            .from('user_invitations')
            .select('email, accepted_at')
            .eq('company_id', userRole.company_id)
            .not('accepted_at', 'is', null);

          if (!invError && invitations) {
            // Mapear emails a usuarios basándose en invitaciones
            Array.from(usersMap.values()).forEach(mappedUser => {
              if (mappedUser.id === user?.id) {
                // Usuario actual siempre muestra su email
                mappedUser.email = user.email || 'N/A';
              } else {
                // Para otros usuarios, intentar encontrar el email en invitaciones
                const matchingInvitation = invitations.find(inv => 
                  mappedUser.first_name && mappedUser.last_name && inv.email && (
                    inv.email.toLowerCase().includes(mappedUser.first_name.toLowerCase()) ||
                    inv.email.toLowerCase().includes(mappedUser.last_name.toLowerCase())
                  )
                );
                
                if (matchingInvitation) {
                  mappedUser.email = matchingInvitation.email;
                } else {
                  mappedUser.email = 'Email privado';
                }
              }
            });
          }
        } catch (error) {
          console.warn('No se pudieron obtener emails, usando método básico');
          // Fallback: solo mostrar email del usuario actual
          if (user?.id && usersMap.has(user.id)) {
            const currentUser = usersMap.get(user.id)!;
            currentUser.email = user.email || 'N/A';
          }
        }
      } else {
        // Usuarios sin privilegios solo ven su propio email
        if (user?.id && usersMap.has(user.id)) {
          const currentUser = usersMap.get(user.id)!;
          currentUser.email = user.email || 'N/A';
        }
      }

      const usersList = Array.from(usersMap.values());
      setUsers(usersList);
      setFilteredUsers(usersList); // Inicializar usuarios filtrados
      
      // Calcular estadísticas después de obtener los usuarios
      calculateStats(usersList, userRole?.company_id);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Effect para aplicar filtros
  useEffect(() => {
    applyFilters();
  }, [searchTerm, roleFilter, statusFilter, users]);

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = [...users];

    // Filtro de búsqueda por nombre/email
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        return fullName.includes(searchLower) || 
               user.email.toLowerCase().includes(searchLower);
      });
    }

    // Filtro por rol
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        // Convertir roles del usuario a sus valores originales
        const userRoles = user.role.split(', ').map((roleLabel) => {
          return Object.entries({
            'superadmin': 'Super Admin',
            'company_owner': 'Propietario',
            'general_manager': 'Gerente General', 
            'operations_manager': 'Gerente de Operaciones',
            'safety_manager': 'Gerente de Seguridad',
            'senior_dispatcher': 'Despachador Senior',
            'dispatcher': 'Despachador',
            'driver': 'Conductor',
          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
        });
        return userRoles.includes(roleFilter);
      });
    }

    // Filtro por estado
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const calculateStats = async (usersList: User[], companyId?: string) => {
    if (!companyId) return;

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Calcular estadísticas básicas de usuarios
      const totalUsers = usersList.length;
      const activeUsers = usersList.filter(u => u.status === 'active').length;
      
      // Contar usuarios recientes (registrados en la última semana)
      const recentUsers = usersList.filter(u => 
        new Date(u.created_at) >= oneWeekAgo
      ).length;

      // Contar usuarios por rol
      const usersByRole: Record<string, number> = {};
      usersList.forEach(user => {
        const userRoles = user.role.split(', ');
        userRoles.forEach(roleLabel => {
          // Obtener el rol original desde el label
          const originalRole = Object.entries({
            'superadmin': 'Super Admin',
            'company_owner': 'Propietario',
            'general_manager': 'Gerente General', 
            'operations_manager': 'Gerente de Operaciones',
            'safety_manager': 'Gerente de Seguridad',
            'senior_dispatcher': 'Despachador Senior',
            'dispatcher': 'Despachador',
            'driver': 'Conductor',
          }).find(([key, value]) => value === roleLabel)?.[0] || 'driver';
          
          usersByRole[originalRole] = (usersByRole[originalRole] || 0) + 1;
        });
      });

      // Obtener invitaciones pendientes enviadas por el usuario actual
      const { count: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('invited_by', user?.id) // Solo invitaciones enviadas por el usuario actual
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (invitationsError) {
        console.error('Error fetching pending invitations:', invitationsError);
      }

      setStats({
        totalUsers,
        activeUsers,
        pendingInvitations: pendingInvitations || 0,
        usersByRole,
        recentUsers
      });

    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (preventDefaultError) {
      // Ignorar errores de preventDefault en event listeners pasivos
      console.warn('preventDefault error ignored:', preventDefaultError);
    }
    
    // Limpiar espacios innecesarios de los campos de texto usando la utilidad global
    const cleanedForm = {
      email: handleTextBlur(inviteForm.email),
      role: inviteForm.role,
      first_name: handleTextBlur(inviteForm.first_name),
      last_name: handleTextBlur(inviteForm.last_name)
    };
    
    if (!cleanedForm.email || !cleanedForm.role) {
      showError('Email y rol son requeridos');
      return;
    }

    if (!userRole?.company_id) {
      showError('No se pudo obtener la información de la empresa');
      return;
    }

    setLoading(true);
    
    try {
      // Obtener información de la empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', userRole.company_id)
        .single();

      if (companyError) throw companyError;

      // Obtener el token de autenticación
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      // Llamar a la función edge para enviar invitación
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          companyId: userRole.company_id,
          email: cleanedForm.email,
          companyName: companyData.name,
          role: cleanedForm.role,
          first_name: cleanedForm.first_name,
          last_name: cleanedForm.last_name,
        },
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        console.error('Error inviting user:', error);
        throw new Error(error.message || 'Error al enviar invitación');
      }

      if (!data || !data.success) {
        console.error('Function result error:', data);
        throw new Error(data?.error || 'Error al enviar invitación');
      }

      const displayName = cleanedForm.first_name && cleanedForm.last_name 
        ? `${cleanedForm.first_name} ${cleanedForm.last_name}` 
        : cleanedForm.email;

      showSuccess(
        'Invitación Enviada',
        `Se ha enviado una invitación a ${displayName}. Recibirá un email con instrucciones para configurar su cuenta.`
      );
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: '', first_name: '', last_name: '' });
      
      // Recargar la lista de usuarios
      fetchUsers();
      
    } catch (error: any) {
      console.error('Error inviting user:', error);
      showError(error.message || 'Error al enviar la invitación');
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

  // Jerarquía de roles según importancia organizacional (misma que RoleSwitcher)
  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      'superadmin': 'Super Admin',
      'company_owner': 'Propietario',
      'general_manager': 'Gerente General', 
      'operations_manager': 'Gerente de Operaciones',
      'safety_manager': 'Gerente de Seguridad',
      'senior_dispatcher': 'Despachador Senior',
      'dispatcher': 'Despachador',
      'driver': 'Conductor',
    };
    
    return roleLabels[role] || role;
  };

  return (
    <div>
      {/* Page Toolbar */}
      <PageToolbar
        icon={UsersIcon}
        title="Usuarios de la Empresa"
        subtitle={`${filteredUsers.length} usuarios • ${filteredUsers.filter(u => u.status === 'active').length} activos • ${new Set(filteredUsers.map(u => u.role)).size} roles diferentes`}
        actions={
          <div className="flex items-center gap-2">
            <UserFiltersSheet
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
            <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </div>
        }
        viewToggle={
          <div className="flex border border-border rounded-lg">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Dashboard de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Usuarios</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invitaciones Pendientes</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pendingInvitations}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nuevos esta Semana</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.recentUsers}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuarios */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardDescription>
                Lista de todos los usuarios registrados en tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {viewMode === 'table' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                             {user.avatar_url ? (
                               <div className="w-8 h-8 flex-shrink-0">
                                 <img 
                                   src={user.avatar_url} 
                                   alt={`${user.first_name} ${user.last_name}`}
                                   className="w-full h-full rounded-full object-cover object-center border border-border"
                                 />
                               </div>
                            ) : (
                               <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                 {user.first_name && user.last_name 
                                   ? `${user.first_name[0]}${user.last_name[0]}` 
                                   : user.email.slice(0, 2).toUpperCase()}
                               </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : 'Sin nombre'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'No especificado'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Mostrar botón de editar conductor solo para conductores */}
                            {user.role.toLowerCase().includes('conductor') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDriverId(user.id);
                                  setSelectedDriverName(`${user.first_name} ${user.last_name}` || user.email);
                                  setEditDriverModalOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {/* Solo superadmin y company_owner pueden eliminar usuarios */}
                            {userRole?.role && ['superadmin', 'company_owner'].includes(userRole.role) && user.id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implementar eliminación de usuario
                                  showInfo('Función de eliminar usuario próximamente');
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                           {user.avatar_url ? (
                             <div className="w-10 h-10 flex-shrink-0">
                               <img 
                                 src={user.avatar_url} 
                                 alt={`${user.first_name} ${user.last_name}`}
                                 className="w-full h-full rounded-full object-cover object-center border border-border"
                               />
                             </div>
                          ) : (
                             <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                               {user.first_name && user.last_name 
                                 ? `${user.first_name[0]}${user.last_name[0]}` 
                                 : user.email.slice(0, 2).toUpperCase()}
                             </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : 'Sin nombre'}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Teléfono:</span>
                              <span className="text-sm">{user.phone || 'No especificado'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Rol:</span>
                              <Badge variant="outline">{user.role}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Estado:</span>
                              {getStatusBadge(user.status)}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Registro:</span>
                              <span className="text-sm">{new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                            
                            {/* Botón de editar conductor para vista de tarjetas */}
                            {user.role.toLowerCase().includes('conductor') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDriverId(user.id);
                                  setSelectedDriverName(`${user.first_name} ${user.last_name}` || user.email);
                                  setEditDriverModalOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Conductor
                              </Button>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                          </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog para invitar usuario */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Envía una invitación por email para que se una a tu empresa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver detalles del usuario */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                 {selectedUser.avatar_url ? (
                   <div className="w-16 h-16 flex-shrink-0">
                     <img 
                       src={selectedUser.avatar_url} 
                       alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                       className="w-full h-full rounded-full object-cover object-center border-2 border-border"
                     />
                   </div>
                ) : (
                   <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
                     {selectedUser.first_name && selectedUser.last_name 
                       ? `${selectedUser.first_name[0]}${selectedUser.last_name[0]}` 
                       : selectedUser.email.slice(0, 2).toUpperCase()}
                   </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedUser.first_name && selectedUser.last_name
                      ? `${selectedUser.first_name} ${selectedUser.last_name}`
                      : 'Sin nombre'}
                  </h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rol</Label>
                  <p>{selectedUser.role}</p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <p>{selectedUser.phone || 'No especificado'}</p>
                </div>
                <div>
                  <Label>Fecha de Registro</Label>
                  <p>{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edición general de usuario */}
      <EditUserDialog
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers(); // Recargar la lista
        }}
      />

      {/* Modal de edición de conductor */}
      <EditDriverModal
        isOpen={editDriverModalOpen}
        onClose={() => {
          setEditDriverModalOpen(false);
          fetchUsers(); // Recargar la lista
        }}
        userId={selectedDriverId}
        userName={selectedDriverName}
      />
    </div>
  );
}